<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketReply extends Model
{
    protected $fillable = ['ticket_id', 'user_id', 'message', 'is_internal_note', 'attachments'];
    protected $casts = ['is_internal_note' => 'boolean', 'attachments' => 'array'];

    public function ticket(): BelongsTo { return $this->belongsTo(SupportTicket::class, 'ticket_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
