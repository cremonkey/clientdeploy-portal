<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SupportTicket;
use App\Models\TicketReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\TicketUpdatedMail;
use App\Notifications\TicketUpdatedNotification;



class SupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->isSuperAdmin() || $user->isAgencyAdmin();
        
        $tickets = SupportTicket::query()
            ->with(['project:id,name', 'createdBy:id,name,avatar', 'client:id,company_name'])
            ->when(!$isAdmin, fn($q) => $q->forClient($user->client_id))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderByDesc('updated_at')
            ->paginate(15);

        return response()->json(['data' => $tickets->items(), 'meta' => [
            'current_page' => $tickets->currentPage(),
            'last_page' => $tickets->lastPage(),
            'total' => $tickets->total(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'project_id' => 'nullable|exists:projects,id',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'category' => 'nullable|string',
        ]);

        $ticket = SupportTicket::create([
            ...$validated,
            'client_id' => $user->client_id,
            'created_by_user_id' => $user->id,
            'status' => 'open',
            'priority' => $validated['priority'] ?? 'medium',
        ]);

        AuditLog::log('ticket.created', [
            'description' => "New ticket created: {$ticket->subject}",
            'metadata' => ['ticket_id' => $ticket->id],
        ]);

        // Notify Staff
        $admins = \App\Models\User::whereIn('role', ['super_admin', 'agency_admin'])->get();
        foreach ($admins as $admin) {
            $admin->notify(new TicketUpdatedNotification($ticket, 'new_ticket', $ticket->message));
        }

        return response()->json(['ticket' => $ticket], 201);


    }

    public function show(SupportTicket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->isSuperAdmin() || $user->isAgencyAdmin();
        
        if (!$isAdmin && $ticket->client_id !== $user->client_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $ticket->load(['replies.user:id,name,avatar', 'project:id,name', 'createdBy:id,name,avatar']);

        return response()->json(['ticket' => $ticket]);
    }

    public function reply(SupportTicket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->isSuperAdmin() || $user->isAgencyAdmin();

        if (!$isAdmin && $ticket->client_id !== $user->client_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate(['message' => 'required|string']);

        $reply = DB::transaction(function () use ($ticket, $request, $user) {
            $reply = TicketReply::create([
                'ticket_id' => $ticket->id,
                'user_id' => $user->id,
                'message' => $request->message,
            ]);

            $ticket->update(['status' => 'open', 'updated_at' => now()]);

            return $reply;
        });

        AuditLog::log('ticket.replied', [
            'description' => "Reply added to ticket #{$ticket->id}",
            'metadata' => ['reply_id' => $reply->id],
        ]);

        // Notify recipient
        if ($isAdmin) {
            // Staff replied, notify client
            $owner = $ticket->client->owner;
            if ($owner) {
                $owner->notify(new TicketUpdatedNotification($ticket, 'reply', $request->message));
            }
        } else {
            // Client replied, notify staff
            $admins = \App\Models\User::whereIn('role', ['super_admin', 'agency_admin'])->get();
            foreach ($admins as $admin) {
                $admin->notify(new TicketUpdatedNotification($ticket, 'reply', $request->message));
            }
        }

        return response()->json(['reply' => $reply->load('user:id,name,avatar')], 201);


    }
}
