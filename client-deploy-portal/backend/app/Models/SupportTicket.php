<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportTicket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id', 'project_id', 'subject', 'message', 'status',
        'priority', 'category', 'created_by_user_id', 'assigned_to_user_id',
        'first_responded_at', 'resolved_at',
    ];

    protected $casts = [
        'first_responded_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by_user_id'); }
    public function assignedTo(): BelongsTo { return $this->belongsTo(User::class, 'assigned_to_user_id'); }
    public function replies(): HasMany { return $this->hasMany(TicketReply::class, 'ticket_id')->orderBy('created_at'); }

    public function scopeOpen($query) { return $query->whereIn('status', ['open', 'in_progress', 'waiting_client']); }
    public function scopeForClient($query, int $clientId) { return $query->where('client_id', $clientId); }
    public function isOpen(): bool { return in_array($this->status, ['open', 'in_progress', 'waiting_client']); }
}
