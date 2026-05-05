<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'user_id', 'client_id', 'project_id', 'action', 'description',
        'ip_address', 'user_agent', 'metadata', 'changes', 'severity', 'created_at',
    ];
    protected $casts = [
        'metadata' => 'array', 'changes' => 'array', 'created_at' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function client() { return $this->belongsTo(Client::class); }
    public function project() { return $this->belongsTo(Project::class); }

    public static function log(string $action, array $data = []): self
    {
        $user = auth()->user();
        return static::create([
            'user_id' => $user?->id,
            'client_id' => $data['client_id'] ?? $user?->client_id,
            'project_id' => $data['project_id'] ?? null,
            'action' => $action,
            'description' => $data['description'] ?? null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => $data['metadata'] ?? null,
            'changes' => $data['changes'] ?? null,
            'severity' => $data['severity'] ?? 'info',
            'created_at' => now(),
        ]);
    }
}
