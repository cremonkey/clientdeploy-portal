<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\CoolifyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

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
                    $coolify->syncDeploymentStatus($project);
                } catch (\Exception $e) {
                    \Log::warning('Sync failed for project', [
                        'project_id' => $project->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        });
    }
}
