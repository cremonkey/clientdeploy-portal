<?php

namespace App\Events;

use App\Models\Project;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeploymentUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $project;
    public $deployment;

    public function __construct(Project $project, array $deployment)
    {
        $this->project = $project;
        $this->deployment = $deployment;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('projects.' . $this->project->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->project->id,
            'status' => $this->deployment['status'] ?? 'unknown',
            'deployment' => $this->deployment,
        ];
    }
}
