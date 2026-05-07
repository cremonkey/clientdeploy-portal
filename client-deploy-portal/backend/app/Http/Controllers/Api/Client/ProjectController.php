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
        
        $query = Project::with('latestDeployment', 'primaryDomain');
        
        if ($user->isClient()) {
            $query->forClient($user->client_id);
        }

        $projects = $query->get()->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'domain' => $p->domain,
            'type' => $p->type,
            'framework' => $p->framework,
            'status' => $p->status,
            'branch' => $p->branch,
            'repository_url' => $p->repository_url,
            'last_deployed_at' => $p->last_deployed_at?->toISOString(),
            'last_deployment' => $p->latestDeployment ? [
                'status' => $p->latestDeployment->status,
                'time' => $p->latestDeployment->created_at->toISOString(),
            ] : null,
            'can_deploy' => $p->canDeploy() && $user->canDeployProject($p),
        ]);

        return response()->json(['projects' => $projects]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$user->isAgencyAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'client_id' => 'required|exists:clients,id',
            'repository_url' => 'required|string',
            'branch' => 'required|string',
            'coolify_application_uuid' => 'required|string',
            'framework' => 'nullable|string',
            'base_directory' => 'nullable|string',
            'install_command' => 'nullable|string',
            'build_command' => 'nullable|string',
            'start_command' => 'nullable|string',
        ]);

        $project = Project::create($validated);

        return response()->json(['project' => $project], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::with(['domains', 'latestDeployment', 'environmentVariables'])->findOrFail($id);

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
                'coolify_application_uuid' => $project->coolify_application_uuid,
                'last_deployed_at' => $project->last_deployed_at?->toISOString(),
                'last_deployment_status' => $project->last_deployment_status,
                'base_directory' => $project->base_directory,
                'install_command' => $project->install_command,
                'build_command' => $project->build_command,
                'start_command' => $project->start_command,
                'domains' => $project->domains->map(fn($d) => [
                    'id' => $d->id,
                    'domain' => $d->domain,
                    'type' => $d->type,
                    'ssl_status' => $d->ssl_status,
                    'is_primary' => $d->is_primary,
                ]),
                'env_vars' => $project->environmentVariables->map(fn($ev) => [
                    'id' => $ev->id,
                    'key' => $ev->key,
                    'value' => $ev->is_sensitive ? '••••••••' : $ev->value_encrypted,
                    'is_sensitive' => $ev->is_sensitive,
                ]),
                'can_deploy' => $project->canDeploy() && $user->canDeployProject($project),
                'can_restart' => $user->canRestartProject($project),
            ],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->isSuperAdmin() && !$user->isAgencyAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'repository_url' => 'sometimes|string',
            'branch' => 'sometimes|string',
            'coolify_application_uuid' => 'sometimes|string',
            'framework' => 'nullable|string',
            'base_directory' => 'nullable|string',
            'install_command' => 'nullable|string',
            'build_command' => 'nullable|string',
            'start_command' => 'nullable|string',
        ]);

        $project->update($validated);

        return response()->json(['project' => $project]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $project->delete();

        return response()->json(['message' => 'Project deleted successfully']);
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

    public function deployments(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $deployments = $project->deployments()
            ->latest()
            ->get();

        try {
            $coolify = app(\App\Services\CoolifyService::class);
            $latest = $coolify->deploymentStatus($project->coolify_application_uuid);

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
                        'finished_at' => in_array($status, ['success', 'failed']) ? now() : null,
                        'logs' => isset($latest['logs']) ? json_encode($latest['logs']) : null,
                    ]);

                    $project->update([
                        'status' => $status,
                        'last_deployed_at' => $status === 'success' ? now() : $project->last_deployed_at,
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
                ->with('triggeredBy:id,name')
                ->latest()
                ->get()
                ->map(fn($d) => [
                    'id' => $d->id,
                    'status' => $d->status,
                    'commit_hash' => $d->commit_hash ? substr($d->commit_hash, 0, 7) : null,
                    'commit_message' => $d->commit_message,
                    'triggered_by' => $d->triggeredBy?->name ?? 'System',
                    'duration' => $d->started_at && $d->finished_at ? $d->started_at->diffInSeconds($d->finished_at) : null,
                    'created_at' => $d->created_at->toISOString(),
                ]),
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

        if (!$result['success']) {
            return response()->json([
                'logs' => 'Unable to fetch logs at this time.',
                'success' => false
            ]);
        }

        // Use summary for clients, sanitized raw logs for others
        $logs = $user->isClient() 
            ? $sanitizer->generateSummary($result['logs'])
            : $sanitizer->sanitize($result['logs']);

        return response()->json([
            'logs' => $logs,
            'success' => true,
            'is_summary' => $user->isClient()
        ]);
    }
}
