<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentVariable extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'key',
        'value_encrypted',
        'is_sensitive',
        'is_client_editable',
        'is_visible_to_client',
        'is_synced_to_coolify',
        'description',
    ];

    protected $casts = [
        'value_encrypted' => 'encrypted',
        'is_sensitive' => 'boolean',
        'is_client_editable' => 'boolean',
        'is_visible_to_client' => 'boolean',
        'is_synced_to_coolify' => 'boolean',
    ];

    protected $hidden = [
        'value_encrypted',
    ];

    // ─── Relationships ───

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ─── Scopes ───

    public function scopeVisibleToClient($query)
    {
        return $query->where('is_visible_to_client', true);
    }

    public function scopeClientEditable($query)
    {
        return $query->where('is_client_editable', true);
    }

    public function scopeSensitive($query)
    {
        return $query->where('is_sensitive', true);
    }

    // ─── Helpers ───

    public function getMaskedValueAttribute(): string
    {
        if ($this->is_sensitive) {
            return '••••••••';
        }

        $value = $this->value_encrypted;
        if (strlen($value) <= 4) {
            return '••••';
        }

        return substr($value, 0, 2) . str_repeat('•', strlen($value) - 4) . substr($value, -2);
    }

    public function getDisplayValueAttribute(): string
    {
        return $this->is_sensitive ? $this->masked_value : $this->value_encrypted;
    }
}
