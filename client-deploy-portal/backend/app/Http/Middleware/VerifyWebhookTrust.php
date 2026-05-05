<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VerifyWebhookTrust
{
    /**
     * Verify incoming webhook requests are from trusted sources.
     * Layer 1: IP allowlist
     * Layer 2: Shared secret token
     * Layer 3: Signature verification (if Coolify supports HMAC)
     */
    public function handle(Request $request, Closure $next)
    {
        // === Layer 1: IP Allowlist ===
        $allowedIPs = array_filter(explode(',', config('services.coolify.webhook_allowed_ips', '')));

        if (!empty($allowedIPs)) {
            $clientIP = $request->ip();
            $trusted = false;

            foreach ($allowedIPs as $allowed) {
                $allowed = trim($allowed);
                if ($allowed === $clientIP) {
                    $trusted = true;
                    break;
                }
                // Support CIDR notation (e.g., 10.0.0.0/8)
                if (str_contains($allowed, '/') && self::ipInCidr($clientIP, $allowed)) {
                    $trusted = true;
                    break;
                }
            }

            if (!$trusted) {
                Log::warning('Webhook rejected: untrusted IP', [
                    'ip' => $clientIP,
                    'allowed' => $allowedIPs,
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        // === Layer 2: Shared Secret Token ===
        $expectedSecret = config('services.coolify.webhook_secret');
        if (!empty($expectedSecret)) {
            $providedSecret = $request->header('X-Webhook-Secret')
                ?? $request->header('Authorization')
                ?? $request->query('secret');

            // Strip "Bearer " prefix if present
            if (str_starts_with($providedSecret ?? '', 'Bearer ')) {
                $providedSecret = substr($providedSecret, 7);
            }

            if (!$providedSecret || !hash_equals($expectedSecret, $providedSecret)) {
                Log::warning('Webhook rejected: invalid secret', [
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => 'Invalid webhook secret'], 403);
            }
        }

        // === Layer 3: HMAC Signature (if provided by Coolify) ===
        $signature = $request->header('X-Hub-Signature-256')
            ?? $request->header('X-Coolify-Signature');

        if ($signature && !empty($expectedSecret)) {
            $payload = $request->getContent();
            $computedSignature = 'sha256=' . hash_hmac('sha256', $payload, $expectedSecret);

            if (!hash_equals($computedSignature, $signature)) {
                Log::warning('Webhook rejected: HMAC signature mismatch', [
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => 'Signature mismatch'], 403);
            }
        }

        return $next($request);
    }

    /**
     * Check if an IP is within a CIDR range
     */
    private static function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $mask] = explode('/', $cidr);
        $mask = (int) $mask;

        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);

        if ($ipLong === false || $subnetLong === false) {
            return false;
        }

        $maskLong = -1 << (32 - $mask);
        return ($ipLong & $maskLong) === ($subnetLong & $maskLong);
    }
}
