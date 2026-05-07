<?php

namespace App\Notifications;

use App\Models\Project;
use App\Mail\DeploymentStatusMail;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class DeploymentStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $project;
    public $status;
    public $payload;

    public function __construct(Project $project, string $status, array $payload = [])
    {
        $this->project = $project;
        $this->status = $status;
        $this->payload = $payload;
    }

    public function via($notifiable)
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable)
    {
        return (new DeploymentStatusMail($this->project, $this->status, $this->payload))
            ->to($notifiable->email);
    }

    public function toArray($notifiable)
    {
        return [
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'status' => $this->status,
            'message' => "Deployment for {$this->project->name} has " . ($this->status === 'success' ? 'succeeded' : 'failed') . ".",
            'type' => 'deployment',
        ];
    }
}
