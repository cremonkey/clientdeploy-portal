<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deployment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'triggered_by_user_id',
        'coolify_deployment_uuid',
        'status',
        'branch',
        'trigger_type',
        'commit_hash',
        'commit_message',
        'logs',
        'error_message',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }

    public function markAsBuilding(?string $coolifyUuid = null): void
    {
        $this->update([
            'status' => 'building',
            'coolify_deployment_uuid' => $coolifyUuid,
            'started_at' => now(),
        ]);
    }

    public function markAsRunning(?string $coolifyUuid = null): void
    {
        $this->update([
            'status' => 'running',
            'coolify_deployment_uuid' => $coolifyUuid,
        ]);
    }

    public function markAsSuccess(?string $logs = null): void
    {
        $this->update([
            'status' => 'success',
            'logs' => $logs,
            'finished_at' => now(),
        ]);
    }

    public function markAsFailed(?string $message = null): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $message,
            'finished_at' => now(),
        ]);
    }
}
