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

class LogReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $project;
    public $log;

    public function __construct(Project $project, string $log)
    {
        $this->project = $project;
        $this->log = $log;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('projects.' . $this->project->id . '.logs'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'log' => $this->log,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
