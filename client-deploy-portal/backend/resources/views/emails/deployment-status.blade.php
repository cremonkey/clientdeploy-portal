@component('mail::message')
# Deployment {{ ucfirst($status) }}

The deployment for project **{{ $project->name }}** has {{ $status === 'success' ? 'completed successfully' : 'failed' }}.

@component('mail::panel')
**Project:** {{ $project->name }}<br>
**Branch:** {{ $project->repository_branch }}<br>
**Environment:** Production<br>
**Status:** {{ strtoupper($status) }}
@endcomponent

@if($status === 'failed')
Something went wrong during the deployment process. Please check the logs in the dashboard for more details.
@else
Your latest changes are now live and accessible.
@endif

@component('mail::button', ['url' => config('app.frontend_url') . '/projects/' . $project->id])
View Deployment Logs
@endcomponent

Thanks,<br>
{{ config('app.name') }} Team
@endcomponent
