<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use App\Mail\TicketUpdatedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class TicketUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $ticket;
    public $updateType;
    public $updateMessage;

    public function __construct(SupportTicket $ticket, string $updateType, string $updateMessage = '')
    {
        $this->ticket = $ticket;
        $this->updateType = $updateType;
        $this->updateMessage = $updateMessage;
    }

    public function via($notifiable)
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable)
    {
        return (new TicketUpdatedMail($this->ticket, $this->updateType, $this->updateMessage))
            ->to($notifiable->email);
    }

    public function toArray($notifiable)
    {
        $action = $this->updateType === 'new_ticket' ? 'created a new ticket' : 'replied to ticket';
        
        return [
            'ticket_id' => $this->ticket->id,
            'subject' => $this->ticket->subject,
            'update_type' => $this->updateType,
            'message' => "Update on ticket #{$this->ticket->id}: {$this->ticket->subject}",
            'type' => 'ticket',
        ];
    }
}
