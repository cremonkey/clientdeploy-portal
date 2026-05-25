<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Project extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'last_deployed_at' => 'datetime',
    ];

    protected static function boot() {
        parent::boot();
        static::creating(fn($p) => $p->slug = $p->slug ?: Str::slug($p->name));
    }

    public function client() { return $this->belongsTo(Client::class); }
    public function deployments() { return $this->hasMany(Deployment::class)->orderByDesc('created_at'); }
    public function latestDeployment() { return $this->hasOne(Deployment::class)->latestOfMany(); }
    public function domains() { return $this->hasMany(Domain::class); }
    public function primaryDomain() { return $this->hasOne(Domain::class)->where('is_primary', true); }
    public function environmentVariables() { return $this->hasMany(EnvironmentVariable::class); }

    public function scopeForClient($query, $clientId) { return $query->where('client_id', $clientId); }

    // Projects that have a Coolify application UUID configured (eligible for sync)
    public function scopeWithCoolify($query) { return $query->whereNotNull('coolify_application_uuid'); }

    public function canDeploy(): bool {
        return in_array($this->status, ['active', 'draft', 'ready', 'running', 'failed', 'stopped']);
    }
}
