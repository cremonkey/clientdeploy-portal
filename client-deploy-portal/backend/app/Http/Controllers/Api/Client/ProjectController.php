<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Jobs\TriggerCoolifyDeploymentJob;
use App\Models\AuditLog;
use App\Models\Deployment;
use App\Models\Project;
use App\Services\CoolifyService;
use App\Services\LogSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $projects = Project::forClient($user->client_id)
            ->with('latestDeployment', 'primaryDomain')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'domain' => $p->domain,
                'type' => $p->type,
                'framework' => $p->framework,
                'status' => $p->status,
                'last_deployment' => $p->latestDeployment ? [
                    'status' => $p->latestDeployment->status,
                    'time' => $p->latestDeployment->created_at->toISOString(),
                ] : null,
                'can_deploy' => $p->canDeploy() && $user->canDeployProject($p),
            ]);

        return response()->json(['projects' => $projects]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::with('domains', 'latestDeployment')->findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'domain' => $project->domain,
                'type' => $project->type,
                'framework' => $project->framework,
                'repository_url' => $project->repository_url,
                'branch' => $project->branch,
                'status' => $project->status,
                'description' => $project->description,
                'last_deployed_at' => $project->last_deployed_at?->toISOString(),
                'last_deployment_status' => $project->last_deployment_status,
                'domains' => $project->domains->map(fn($d) => [
                    'id' => $d->id,
                    'domain' => $d->domain,
                    'type' => $d->type,
                    'ssl_status' => $d->ssl_status,
                ]),
                'can_deploy' => $project->canDeploy() && $user->canDeployProject($project),
                'can_restart' => $user->canRestartProject($project),
            ],
        ]);
    }

    public function deploy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->canDeployProject($project)) {
            return response()->json(['message' => 'You do not have permission to deploy this project.'], 403);
        }

        if (!$project->canDeploy()) {
            return response()->json(['message' => 'This project cannot be deployed right now.'], 422);
        }

        // Rate limit
        $key = "deploy:{$user->id}:{$project->id}";
        if (RateLimiter::tooManyAttempts($key, config('services.coolify.deploy_rate_limit', 5))) {
            return response()->json(['message' => 'Too many deployment attempts. Please wait.'], 429);
        }
        RateLimiter::hit($key, 300);

        // Create deployment record
        $deployment = Deployment::create([
            'project_id' => $project->id,
            'status' => 'queued',
            'branch' => $project->branch,
            'triggered_by_user_id' => $user->id,
            'trigger_type' => 'manual',
        ]);

        // Dispatch async job
        TriggerCoolifyDeploymentJob::dispatch($deployment, $project);

        AuditLog::log('deployment.queued', [
            'project_id' => $project->id,
            'client_id' => $project->client_id,
            'description' => "Deployment queued by {$user->name}",
            'metadata' => ['deployment_id' => $deployment->id],
        ]);

        return response()->json([
            'message' => 'Deployment queued successfully',
            'deployment' => [
                'id' => $deployment->id,
                'status' => $deployment->status,
            ],
        ], 202);
    }


public function deployments(Project $project)
{
    $deployments = $project->deployments()
        ->latest()
        ->get();

    try {
        $coolify = app(\App\Services\CoolifyService::class);

        $latest = $coolify->deploymentStatus(
            $project->coolify_application_uuid
        );

        if (!empty($latest)) {

            $latestDeployment = $deployments->first();

            if ($latestDeployment) {

                $status = match ($latest['status']) {
                    'successful', 'finished', 'success' => 'success',
                    'failed', 'error' => 'failed',
                    'in_progress', 'running', 'queued' => 'deploying',
                    default => 'deploying',
                };

                $latestDeployment->update([
                    'status' => $status,
                    'coolify_deployment_uuid' => $latest['deployment_uuid'] ?? null,
                    'finished_at' => in_array($status, ['success', 'failed'])
                        ? now()
                        : null,
                    'logs' => isset($latest['logs'])
                        ? json_encode($latest['logs'])
                        : null,
                ]);

                $project->update([
                    'status' => $status,
                    'last_deployed_at' => $status === 'success'
                        ? now()
                        : $project->last_deployed_at,
                ]);
            }
        }

    } catch (\Throwable $e) {
        \Log::error('Deployment sync failed', [
            'project_id' => $project->id,
            'error' => $e->getMessage(),
        ]);
    }

    return response()->json([
        'deployments' => $project->deployments()
            ->latest()
            ->get(),
    ]);
}


    public function logs(Request $request, int $id, CoolifyService $coolify, LogSanitizer $sanitizer): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $result = $coolify->getApplicationLogs($project, 200);

        $logs = $result['success']
            ? $sanitizer->sanitize($result['logs'])
            : 'Unable to fetch logs at this time.';

        return response()->json(['logs' => $logs, 'success' => $result['success']]);
    }
}
