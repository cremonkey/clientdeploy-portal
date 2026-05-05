<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Deployment;
use App\Models\Project;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class DeploymentGuard
{
    /**
     * Check if a deployment can proceed — enforces ALL rate limits
     *
     * @throws \Exception with specific denial reason
     */
    public static function authorize(Project $project, Client $client): void
    {
        // 1. Client must be active
        if (!$client->canDeploy()) {
            throw new \Exception('Client account is suspended. Contact support.');
        }

        // 2. Project must be deployable
        if (!$project->canDeploy()) {
            throw new \Exception('This project cannot be deployed in its current state.');
        }

        // 3. Max deploys per hour per project (default: 5)
        $maxPerHour = (int) config('services.coolify.max_deploys_per_hour', 5);
        $hourlyKey = "deploy:hourly:{$project->id}";
        $hourlyCount = (int) Cache::get($hourlyKey, 0);

        if ($hourlyCount >= $maxPerHour) {
            throw new \Exception("Rate limit: max {$maxPerHour} deployments per hour for this project.");
        }

        // 4. Max concurrent deploys per client (default: 2)
        $maxConcurrent = (int) config('services.coolify.max_concurrent_per_client', 2);
        $activeDeployments = Deployment::where('project_id', $project->id)
            ->whereIn('status', ['queued', 'building', 'deploying'])
            ->count();

        // Count across ALL client projects
        $clientActiveDeployments = Deployment::whereHas('project', function ($q) use ($client) {
            $q->where('client_id', $client->id);
        })->whereIn('status', ['queued', 'building', 'deploying'])->count();

        if ($clientActiveDeployments >= $maxConcurrent) {
            throw new \Exception("Concurrent limit: max {$maxConcurrent} simultaneous deployments per client.");
        }

        // 5. Max daily deploys per client (based on plan)
        $dailyLimit = $client->plan?->deployment_limit_per_day ?? 20;
        $dailyKey = "deploy:daily:{$client->id}";
        $dailyCount = (int) Cache::get($dailyKey, 0);

        if ($dailyCount >= $dailyLimit) {
            throw new \Exception("Daily limit reached: max {$dailyLimit} deployments per day on your plan.");
        }

        // 6. Cooldown between deploys for same project (min 30 seconds)
        $cooldownKey = "deploy:cooldown:{$project->id}";
        if (Cache::has($cooldownKey)) {
            $remaining = Cache::get($cooldownKey);
            throw new \Exception("Please wait before deploying again. Cooldown active.");
        }
    }

    /**
     * Record that a deployment was triggered — increment counters
     */
    public static function recordDeployment(Project $project, Client $client): void
    {
        // Hourly counter (expires in 1 hour)
        $hourlyKey = "deploy:hourly:{$project->id}";
        Cache::increment($hourlyKey);
        if (!Cache::has("{$hourlyKey}:ttl")) {
            Cache::put($hourlyKey, Cache::get($hourlyKey, 1), now()->addHour());
            Cache::put("{$hourlyKey}:ttl", true, now()->addHour());
        }

        // Daily counter (expires at midnight)
        $dailyKey = "deploy:daily:{$client->id}";
        Cache::increment($dailyKey);
        if (!Cache::has("{$dailyKey}:ttl")) {
            Cache::put($dailyKey, Cache::get($dailyKey, 1), now()->endOfDay());
            Cache::put("{$dailyKey}:ttl", true, now()->endOfDay());
        }

        // Cooldown (30 seconds)
        Cache::put("deploy:cooldown:{$project->id}", true, 30);
    }

    /**
     * Get remaining quota info for display
     */
    public static function getQuotaInfo(Project $project, Client $client): array
    {
        $maxPerHour = (int) config('services.coolify.max_deploys_per_hour', 5);
        $maxConcurrent = (int) config('services.coolify.max_concurrent_per_client', 2);
        $dailyLimit = $client->plan?->deployment_limit_per_day ?? 20;

        $hourlyUsed = (int) Cache::get("deploy:hourly:{$project->id}", 0);
        $dailyUsed = (int) Cache::get("deploy:daily:{$client->id}", 0);

        $activeDeployments = Deployment::whereHas('project', function ($q) use ($client) {
            $q->where('client_id', $client->id);
        })->whereIn('status', ['queued', 'building', 'deploying'])->count();

        return [
            'hourly' => ['used' => $hourlyUsed, 'limit' => $maxPerHour, 'remaining' => max(0, $maxPerHour - $hourlyUsed)],
            'daily' => ['used' => $dailyUsed, 'limit' => $dailyLimit, 'remaining' => max(0, $dailyLimit - $dailyUsed)],
            'concurrent' => ['active' => $activeDeployments, 'limit' => $maxConcurrent, 'remaining' => max(0, $maxConcurrent - $activeDeployments)],
            'cooldown_active' => Cache::has("deploy:cooldown:{$project->id}"),
        ];
    }
}
