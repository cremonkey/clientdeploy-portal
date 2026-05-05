<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\Client\DashboardController;
use App\Http\Controllers\Api\Client\ProjectController;

/*
|--------------------------------------------------------------------------
| Health Check (public — for Uptime Kuma / BetterStack)
|--------------------------------------------------------------------------
*/
Route::get('/health', [HealthController::class, 'check']);

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

/*
|--------------------------------------------------------------------------
| Client Portal (authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->prefix('client')->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::post('/projects/{project}/deploy', [ProjectController::class, 'deploy'])->middleware('throttle:10,1');
    Route::get('/projects/{project}/deployments', [ProjectController::class, 'deployments']);
    Route::get('/projects/{project}/logs', [ProjectController::class, 'logs']);
    Route::get('/projects/{project}/deploy-quota', [ProjectController::class, 'deployQuota']);
});

/*
|--------------------------------------------------------------------------
| Admin (authenticated + admin role) — Deep health check
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {
    Route::get('/health/deep', [HealthController::class, 'deep']);
});

/*
|--------------------------------------------------------------------------
| Webhooks (verified via middleware, no auth)
|--------------------------------------------------------------------------
*/
Route::prefix('webhooks')->middleware(\App\Http\Middleware\VerifyWebhookTrust::class)->group(function () {
    Route::post('/coolify', [WebhookController::class, 'handleCoolify']);
});
