<?php

namespace App\Mail;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TicketUpdatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $updateType;
    public $updateMessage;

    public function __construct(SupportTicket $ticket, string $updateType, string $updateMessage = '')
    {
        $this->ticket = $ticket;
        $this->updateType = $updateType; // 'reply' or 'status_change'
        $this->updateMessage = $updateMessage;
    }

    public function build()
    {
        $subject = sprintf(
            'Support Ticket Update: %s (#%d)',
            $this->ticket->subject,
            $this->ticket->id
        );

        return $this->subject($subject)
                    ->markdown('emails.ticket-updated');
    }
}
