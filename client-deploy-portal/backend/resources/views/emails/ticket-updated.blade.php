@component('mail::message')
# Support Ticket Update

There has been an update to your support ticket: **{{ $ticket->subject }}**.

@if($updateType === 'reply')
## New Reply
{{ $updateMessage }}
@else
## Status Changed
The status of your ticket has been updated to: **{{ strtoupper($ticket->status) }}**.
@endif

@component('mail::button', ['url' => config('app.frontend_url') . '/support/' . $ticket->id])
View Ticket & Reply
@endcomponent

If you have any further questions, please don't hesitate to reach out.

Thanks,<br>
{{ config('app.name') }} Support
@endcomponent
