<?php

namespace App\Jobs;

use App\Events\DeploymentUpdated;
use App\Models\Deployment;
use App\Models\Project;
use App\Services\CoolifyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncDeploymentStatusJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 60;

    public function __construct(private ?int $projectId = null) {}

    public function handle(CoolifyService $coolify): void
    {
        $query = Project::withCoolify();

        if ($this->projectId) {
            $query->where('id', $this->projectId);
        }

        $query->chunk(50, function ($projects) use ($coolify) {
            foreach ($projects as $project) {
                try {
                    $this->syncProject($coolify, $project);
                } catch (\Exception $e) {
                    Log::warning('Sync failed for project', [
                        'project_id' => $project->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        });
    }

    private function syncProject(CoolifyService $coolify, Project $project): void
    {
        $latestDeployment = $project->deployments()
            ->whereIn('status', ['building', 'deploying', 'running'])
            ->latest()
            ->first();

        if (! $latestDeployment) {
            return;
        }

        $statusData = $coolify->deploymentStatus($project->coolify_application_uuid);
        $remoteStatus = $statusData['status'] ?? null;
        $coolifyUuid  = $statusData['id'] ?? $statusData['uuid'] ?? null;

        // If no deployment record, fall back to checking the service container status
        if (empty($statusData) || ! $remoteStatus) {
            $this->syncServiceStatus($coolify, $project, $latestDeployment);
            return;
        }

        $statusMap = [
            'finished'    => 'success',
            'success'     => 'success',
            'failed'      => 'failed',
            'error'       => 'failed',
            'running'     => 'running',
            'in_progress' => 'building',
        ];

        $mappedStatus = $statusMap[$remoteStatus] ?? null;

        if (! $mappedStatus || $mappedStatus === $latestDeployment->status) {
            return;
        }

        match ($mappedStatus) {
            'success' => $latestDeployment->markAsSuccess(),
            'failed'  => $latestDeployment->markAsFailed($statusData['error_message'] ?? 'Deployment failed'),
            default   => $latestDeployment->update(['status' => $mappedStatus]),
        };

        if ($coolifyUuid && ! $latestDeployment->coolify_deployment_uuid) {
            $latestDeployment->update(['coolify_deployment_uuid' => $coolifyUuid]);
        }

        $project->update(['last_deployment_status' => $mappedStatus]);

        broadcast(new DeploymentUpdated($latestDeployment->fresh()))->toOthers();
    }

    private function syncServiceStatus(CoolifyService $coolify, Project $project, $latestDeployment): void
    {
        try {
            $service = $coolify->getService($project->coolify_application_uuid);
            $apps = $service['applications'] ?? [];

            $allRunning = count($apps) > 0 && collect($apps)->every(
                fn($a) => str_starts_with($a['status'] ?? '', 'running')
            );
            $anyFailed = collect($apps)->contains(
                fn($a) => str_starts_with($a['status'] ?? '', 'fail') || str_starts_with($a['status'] ?? '', 'error')
            );

            if ($anyFailed) {
                $latestDeployment->markAsFailed('Service containers reported failure.');
                $project->update(['status' => 'failed', 'last_deployment_status' => 'failed']);
            } elseif ($allRunning && in_array($latestDeployment->status, ['deploying', 'building'])) {
                $latestDeployment->markAsSuccess();
                $project->update(['status' => 'active', 'last_deployment_status' => 'success']);
            } else {
                return;
            }

            broadcast(new DeploymentUpdated($latestDeployment->fresh()))->toOthers();
        } catch (\Throwable) {
            // Ignore — service status check is best-effort
        }
    }
}
