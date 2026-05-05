<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Domain extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'domain',
        'type',
        'ssl_status',
        'verification_status',
        'dns_records',
        'ssl_expires_at',
        'verified_at',
    ];

    protected $casts = [
        'dns_records' => 'array',
        'ssl_expires_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function isPrimary(): bool
    {
        return $this->type === 'primary';
    }

    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }

    public function hasSsl(): bool
    {
        return $this->ssl_status === 'active';
    }

    public function isSslExpiringSoon(): bool
    {
        if (!$this->ssl_expires_at) return false;
        return $this->ssl_expires_at->diffInDays(now()) <= 30;
    }
}
