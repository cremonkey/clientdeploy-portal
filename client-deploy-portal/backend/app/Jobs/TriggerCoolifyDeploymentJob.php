<?php

namespace App\Jobs;

use App\Models\Deployment;
use App\Models\Project;
use App\Models\AuditLog;
use App\Services\CoolifyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class TriggerCoolifyDeploymentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;
    public int $timeout = 300;

    public function __construct(
        private Deployment $deployment,
        private Project $project,
    ) {}

    public function handle(CoolifyService $coolify): void
    {
        Log::info('TriggerCoolifyDeploymentJob started', [
            'deployment_id' => $this->deployment->id,
            'project_id' => $this->project->id,
        ]);

        try {
            // Mark as building
            $this->deployment->markAsBuilding();
            $this->project->update(['status' => 'deploying']);

            // Call Coolify API
            $result = $coolify->triggerDeployment($this->project);

            if (!$result['success']) {
                $this->deployment->markAsFailed($result['error'] ?? 'Unknown error');
                $this->project->update(['status' => 'failed', 'last_deployment_status' => 'failed']);

                AuditLog::log('deployment.failed', [
                    'project_id' => $this->project->id,
                    'description' => 'Deployment failed: ' . ($result['error'] ?? 'Unknown'),
                    'severity' => 'warning',
                ]);
                return;
            }

            // Store Coolify deployment UUID
            $this->deployment->update([
                'coolify_deployment_uuid' => $result['deployment_uuid'] ?? null,
                'status' => 'deploying',
            ]);

            AuditLog::log('deployment.triggered', [
                'project_id' => $this->project->id,
                'description' => 'Deployment triggered successfully',
                'metadata' => ['coolify_uuid' => $result['deployment_uuid'] ?? null],
            ]);

        } catch (\Exception $e) {
            Log::error('TriggerCoolifyDeploymentJob failed', [
                'deployment_id' => $this->deployment->id,
                'error' => $e->getMessage(),
            ]);

            $this->deployment->markAsFailed($e->getMessage());
            $this->project->update(['status' => 'failed', 'last_deployment_status' => 'failed']);

            AuditLog::log('deployment.error', [
                'project_id' => $this->project->id,
                'description' => 'Deployment job exception: ' . $e->getMessage(),
                'severity' => 'critical',
            ]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        $this->deployment->markAsFailed('Job failed after retries: ' . $exception->getMessage());
        $this->project->update(['status' => 'failed', 'last_deployment_status' => 'failed']);
    }
}
