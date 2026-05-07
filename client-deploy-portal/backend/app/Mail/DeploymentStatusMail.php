<?php

namespace App\Mail;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DeploymentStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public $project;
    public $status;
    public $deploymentDetails;

    public function __construct(Project $project, string $status, array $deploymentDetails = [])
    {
        $this->project = $project;
        $this->status = $status;
        $this->deploymentDetails = $deploymentDetails;
    }

    public function build()
    {
        $subject = sprintf(
            '[%s] Deployment %s: %s',
            strtoupper($this->status),
            $this->status === 'success' ? 'Successful' : 'Failed',
            $this->project->name
        );

        return $this->subject($subject)
                    ->markdown('emails.deployment-status');
    }
}
