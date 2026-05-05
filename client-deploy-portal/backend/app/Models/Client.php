<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = ['company_name', 'slug', 'owner_user_id', 'billing_email', 'phone', 'country', 'plan_id', 'status', 'notes'];

    protected static function boot() {
        parent::boot();
        static::creating(fn($c) => $c->slug = $c->slug ?: Str::slug($c->company_name));
    }

    public function owner() { return $this->belongsTo(User::class, 'owner_user_id'); }
    public function plan() { return $this->belongsTo(Plan::class); }
    public function users() { return $this->hasMany(User::class); }
    public function projects() { return $this->hasMany(Project::class); }
    public function supportTickets() { return $this->hasMany(SupportTicket::class); }
    public function auditLogs() { return $this->hasMany(AuditLog::class); }

    public function scopeActive($q) { return $q->where('status', 'active'); }
    public function isActive(): bool { return $this->status === 'active'; }
    public function isSuspended(): bool { return $this->status === 'suspended'; }
    public function canDeploy(): bool { return $this->isActive(); }
}
