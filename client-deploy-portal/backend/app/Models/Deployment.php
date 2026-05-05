<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deployment extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function project() { return $this->belongsTo(Project::class); }
    public function triggeredBy() { return $this->belongsTo(User::class, 'triggered_by_user_id'); }

    public function getShortCommitHashAttribute() {
        return $this->commit_hash ? substr($this->commit_hash, 0, 7) : null;
    }

    public function getFormattedDurationAttribute() {
        if (!$this->started_at || !$this->finished_at) return null;
        return $this->started_at->diffInSeconds($this->finished_at) . 's';
    }
}
