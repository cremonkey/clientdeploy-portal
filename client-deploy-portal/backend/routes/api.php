<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\Client\DashboardController;
use App\Http\Controllers\Api\Client\ProjectController;
use App\Http\Controllers\Api\Client\EnvironmentVariableController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'time' => now()->toDateTimeString(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
        Route::patch('/profile/password', [\App\Http\Controllers\Api\ProfileController::class, 'updatePassword']);
        
        // Notifications
        Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
    });
});


Route::middleware(['auth:sanctum'])->prefix('client')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::post('/projects/{project}/deploy', [ProjectController::class, 'deploy'])->middleware('throttle:10,1');
    Route::get('/projects/{project}/deployments', [ProjectController::class, 'deployments']);
    Route::get('/projects/{project}/logs', [ProjectController::class, 'logs']);

    Route::get('/projects/{project}/env', [EnvironmentVariableController::class, 'index']);
    Route::post('/projects/{project}/env', [EnvironmentVariableController::class, 'store']);
    Route::patch('/projects/{project}/env/{env}', [EnvironmentVariableController::class, 'update']);
    Route::delete('/projects/{project}/env/{env}', [EnvironmentVariableController::class, 'destroy']);

    Route::get('/tickets', [\App\Http\Controllers\Api\Client\SupportTicketController::class, 'index']);
    Route::post('/tickets', [\App\Http\Controllers\Api\Client\SupportTicketController::class, 'store']);
    Route::get('/tickets/{ticket}', [\App\Http\Controllers\Api\Client\SupportTicketController::class, 'show']);
    Route::post('/tickets/{ticket}/reply', [\App\Http\Controllers\Api\Client\SupportTicketController::class, 'reply']);

    Route::get('/projects/{project}/domains', [\App\Http\Controllers\Api\Client\DomainController::class, 'index']);
    Route::post('/projects/{project}/domains', [\App\Http\Controllers\Api\Client\DomainController::class, 'store']);
    Route::delete('/projects/{project}/domains/{domain}', [\App\Http\Controllers\Api\Client\DomainController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {
    Route::get('/health/deep', [HealthController::class, 'deep']);
    
    // Clients
    Route::get('/clients', [\App\Http\Controllers\Api\Admin\ClientController::class, 'index']);
    Route::post('/clients', [\App\Http\Controllers\Api\Admin\ClientController::class, 'store']);
    Route::get('/clients/{client}', [\App\Http\Controllers\Api\Admin\ClientController::class, 'show']);
    Route::patch('/clients/{client}', [\App\Http\Controllers\Api\Admin\ClientController::class, 'update']);
    Route::delete('/clients/{client}', [\App\Http\Controllers\Api\Admin\ClientController::class, 'destroy']);

    // Audit Logs
    Route::get('/audit-logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
    Route::get('/audit-logs/export', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'export']);
});

Route::prefix('webhooks')
    ->middleware(\App\Http\Middleware\VerifyWebhookTrust::class)
    ->group(function () {
        Route::post('/coolify', [WebhookController::class, 'coolify']);
    });
