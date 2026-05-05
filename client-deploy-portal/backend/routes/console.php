<?php

use Illuminate\Support\Facades\Schedule;

// === Deployment Status Sync ===
Schedule::job(new \App\Jobs\SyncDeploymentStatusJob)->everyMinute();

// === Database Backups ===
Schedule::command('backup:database --type=daily --compress')->dailyAt('03:00');
Schedule::command('backup:database --type=weekly --compress')->weeklyOn(0, '04:00');

// === Stale Deployment Cleanup ===
// Mark deployments stuck in 'building'/'deploying' for >30min as failed
Schedule::call(function () {
    \App\Models\Deployment::whereIn('status', ['building', 'deploying'])
        ->where('updated_at', '<', now()->subMinutes(30))
        ->update([
            'status' => 'failed',
            'error_message' => 'Deployment timed out after 30 minutes',
            'finished_at' => now(),
        ]);
})->everyFiveMinutes();

// === Cache Cleanup ===
Schedule::command('cache:prune-stale-tags')->hourly();
