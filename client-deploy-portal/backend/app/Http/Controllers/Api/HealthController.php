<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class HealthController extends Controller
{
    /**
     * Basic health check — for uptime monitoring (Uptime Kuma, BetterStack)
     * GET /api/health
     */
    public function check(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'version' => config('app.version', '1.0.0'),
        ]);
    }

    /**
     * Deep health check — tests all dependencies
     * GET /api/health/deep (admin auth required)
     */
    public function deep(): JsonResponse
    {
        $checks = [];
        $healthy = true;

        // Database
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $checks['database'] = [
                'status' => 'ok',
                'latency_ms' => round((microtime(true) - $start) * 1000, 2),
            ];
        } catch (\Throwable $e) {
            $checks['database'] = ['status' => 'error', 'message' => 'Connection failed'];
            $healthy = false;
        }

        // Redis
        try {
            $start = microtime(true);
            Cache::store('redis')->put('health_check', true, 5);
            $val = Cache::store('redis')->get('health_check');
            $checks['redis'] = [
                'status' => $val ? 'ok' : 'error',
                'latency_ms' => round((microtime(true) - $start) * 1000, 2),
            ];
            if (!$val) $healthy = false;
        } catch (\Throwable $e) {
            $checks['redis'] = ['status' => 'error', 'message' => 'Connection failed'];
            $healthy = false;
        }

        // Queue
        try {
            $queueSize = \Illuminate\Support\Facades\Queue::size('default');
            $checks['queue'] = [
                'status' => 'ok',
                'pending_jobs' => $queueSize,
                'warning' => $queueSize > 100,
            ];
        } catch (\Throwable $e) {
            $checks['queue'] = ['status' => 'error', 'message' => 'Queue unreachable'];
            $healthy = false;
        }

        // Coolify API
        try {
            $start = microtime(true);
            $response = Http::timeout(5)
                ->withHeaders(['Authorization' => 'Bearer ' . config('services.coolify.token')])
                ->get(config('services.coolify.base_url') . '/api/v1/version');
            $checks['coolify'] = [
                'status' => $response->successful() ? 'ok' : 'error',
                'latency_ms' => round((microtime(true) - $start) * 1000, 2),
                'version' => $response->successful() ? $response->json('version', 'unknown') : null,
            ];
            if (!$response->successful()) $healthy = false;
        } catch (\Throwable $e) {
            $checks['coolify'] = ['status' => 'error', 'message' => 'API unreachable'];
            $healthy = false;
        }

        // Disk space
        $freeBytes = disk_free_space(storage_path());
        $totalBytes = disk_total_space(storage_path());
        $usedPercent = round((1 - $freeBytes / $totalBytes) * 100, 1);
        $checks['disk'] = [
            'status' => $usedPercent < 90 ? 'ok' : ($usedPercent < 95 ? 'warning' : 'error'),
            'used_percent' => $usedPercent,
            'free_gb' => round($freeBytes / 1073741824, 2),
        ];
        if ($usedPercent >= 95) $healthy = false;

        // Last backup check
        $backupDir = storage_path('app/backups/daily');
        $lastBackup = null;
        if (is_dir($backupDir)) {
            $files = glob("{$backupDir}/backup_*");
            if (!empty($files)) {
                usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
                $lastBackup = date('Y-m-d H:i:s', filemtime($files[0]));
            }
        }
        $backupAge = $lastBackup ? now()->diffInHours(\Carbon\Carbon::parse($lastBackup)) : null;
        $checks['backup'] = [
            'status' => $backupAge !== null && $backupAge < 25 ? 'ok' : 'warning',
            'last_backup' => $lastBackup,
            'age_hours' => $backupAge,
        ];

        return response()->json([
            'healthy' => $healthy,
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }
}
