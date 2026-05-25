<?php

namespace App\Events;

use App\Models\Deployment;
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

    public Project $project;
    public Deployment $deployment;

    public function __construct(Deployment $deployment)
    {
        $this->deployment = $deployment;
        $this->project = $deployment->project;
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
            'status' => $this->deployment->status ?? 'unknown',
            'deployment' => $this->deployment->toArray(),
        ];
    }
}
