<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 10)) {
            AuditLog::log('auth.rate_limited', [
                'description' => 'Login rate limit exceeded',
                'severity' => 'warning',
                'metadata' => ['email' => $request->email],
            ]);
            return response()->json(['message' => 'Too many login attempts. Please try again later.'], 429);
        }

        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 300);
            AuditLog::log('auth.login_failed', [
                'description' => 'Failed login attempt for: ' . $request->email,
                'severity' => 'warning',
            ]);
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Your account is not active. Contact support.'], 403);
        }

        if ($user->isClient() && $user->client && $user->client->isSuspended()) {
            return response()->json(['message' => 'Your organization account has been suspended.'], 403);
        }

        RateLimiter::clear($key);

        $token = $user->createToken('portal-token', $this->getAbilitiesForRole($user->role));

        $user->update(['last_login_at' => now(), 'last_login_ip' => $request->ip()]);

        AuditLog::log('auth.login', [
            'description' => 'User logged in successfully',
            'metadata' => ['role' => $user->role],
        ]);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'client_id' => $user->client_id,
                'avatar' => $user->avatar,
                'two_factor_enabled' => $user->two_factor_enabled,
            ],
            'token' => $token->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLog::log('auth.logout', ['description' => 'User logged out']);
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('client');
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'client_id' => $user->client_id,
                'client' => $user->client ? [
                    'id' => $user->client->id,
                    'company_name' => $user->client->company_name,
                    'status' => $user->client->status,
                ] : null,
                'avatar' => $user->avatar,
                'two_factor_enabled' => $user->two_factor_enabled,
                'timezone' => $user->timezone,
            ],
        ]);
    }

    private function getAbilitiesForRole(string $role): array
    {
        return match ($role) {
            'super_admin' => ['*'],
            'agency_admin' => ['client:*', 'project:*', 'deploy:*', 'ticket:*', 'billing:view'],
            'developer' => ['project:*', 'deploy:*', 'env:*', 'logs:*', 'ticket:*'],
            'client_owner' => ['project:view', 'deploy:trigger', 'logs:view', 'env:view', 'ticket:*', 'domain:request'],
            'client_staff' => ['project:view', 'logs:view', 'ticket:create', 'ticket:view'],
            'viewer' => ['project:view', 'logs:view'],
            default => [],
        };
    }
}
