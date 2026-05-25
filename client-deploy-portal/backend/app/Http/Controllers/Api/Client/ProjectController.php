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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Project::with('latestDeployment');

        if ($user->isClient()) {
            $query->forClient($user->client_id);
        }

        $projects = $query
            ->latest()
            ->get()
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'domain' => $project->domain ?? $project->fqdn ?? null,
                'fqdn' => $project->fqdn ?? $project->domain ?? null,
                'type' => $project->type,
                'framework' => $project->framework,
                'status' => $project->status,
                'repository_url' => $project->repository_url,
                'repository_branch' => $project->repository_branch ?? $project->branch ?? 'main',
                'branch' => $project->repository_branch ?? $project->branch ?? 'main',
                'last_deployed_at' => $project->last_deployed_at?->toISOString(),
                'last_deployment' => $project->latestDeployment ? [
                    'id' => $project->latestDeployment->id,
                    'status' => $project->latestDeployment->status,
                    'time' => $project->latestDeployment->created_at->toISOString(),
                    'commit_hash' => $project->latestDeployment->commit_hash,
                    'duration' => $project->latestDeployment->started_at && $project->latestDeployment->finished_at
                        ? $project->latestDeployment->started_at->diffInSeconds($project->latestDeployment->finished_at)
                        : null,
                ] : null,
                'can_deploy' => method_exists($project, 'canDeploy')
                    ? $project->canDeploy() && $user->canDeployProject($project)
                    : $user->canDeployProject($project),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Projects loaded successfully',
            'data' => $projects,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->isAgencyAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'client_id' => 'required|exists:clients,id',
            'repository_url' => 'required|string|max:1000',
            'repository_branch' => 'nullable|string|max:255',
            'branch' => 'nullable|string|max:255',
            'coolify_application_uuid' => 'nullable|string|max:255',
            'framework' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'domain' => 'nullable|string|max:255',
            'fqdn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'base_directory' => 'nullable|string|max:255',
            'install_command' => 'nullable|string|max:1000',
            'build_command' => 'nullable|string|max:1000',
            'start_command' => 'nullable|string|max:1000',
            'publish_directory' => 'nullable|string|max:255',
        ]);

        $validated['repository_branch'] = $validated['repository_branch']
            ?? $validated['branch']
            ?? 'main';

        $validated['branch'] = $validated['branch']
            ?? $validated['repository_branch'];

        $validated['status'] = 'active';

        $project = Project::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Project created successfully',
            'data' => $project,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $project = Project::with(['domains', 'latestDeployment', 'environmentVariables'])
            ->findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Project loaded successfully',
            'data' => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'domain' => $project->domain ?? $project->fqdn ?? null,
                'fqdn' => $project->fqdn ?? $project->domain ?? null,
                'type' => $project->type,
                'framework' => $project->framework,
                'repository_url' => $project->repository_url,
                'repository_branch' => $project->repository_branch ?? $project->branch ?? 'main',
                'branch' => $project->repository_branch ?? $project->branch ?? 'main',
                'status' => $project->status,
                'description' => $project->description,
                'coolify_application_uuid' => $project->coolify_application_uuid,
                'last_deployed_at' => $project->last_deployed_at?->toISOString(),
                'last_deployment_status' => $project->last_deployment_status,
                'base_directory' => $project->base_directory,
                'install_command' => $project->install_command,
                'build_command' => $project->build_command,
                'start_command' => $project->start_command,
                'publish_directory' => $project->publish_directory ?? null,
                'domains' => $project->domains->map(fn ($domain) => [
                    'id' => $domain->id,
                    'domain' => $domain->domain,
                    'type' => $domain->type ?? 'primary',
                    'ssl_status' => $domain->ssl_status ?? 'unknown',
                ])->values(),
                'environment_variables' => $project->environmentVariables->map(fn ($env) => [
                    'id' => $env->id,
                    'key' => $env->key,
                    'value' => $env->is_sensitive ? '••••••••' : $env->value_encrypted,
                    'is_secret' => (bool) $env->is_sensitive,
                ])->values(),
                'last_deployment' => $project->latestDeployment ? [
                    'id' => $project->latestDeployment->id,
                    'status' => $project->latestDeployment->status,
                    'time' => $project->latestDeployment->created_at->toISOString(),
                    'commit_hash' => $project->latestDeployment->commit_hash,
                    'duration' => $project->latestDeployment->started_at && $project->latestDeployment->finished_at
                        ? $project->latestDeployment->started_at->diffInSeconds($project->latestDeployment->finished_at)
                        : null,
                ] : null,
                'can_deploy' => method_exists($project, 'canDeploy')
                    ? $project->canDeploy() && $user->canDeployProject($project)
                    : $user->canDeployProject($project),
                'can_restart' => method_exists($user, 'canRestartProject')
                    ? $user->canRestartProject($project)
                    : $user->canDeployProject($project),
            ],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->isSuperAdmin() && !$user->isAgencyAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'repository_url' => 'sometimes|string|max:1000',
            'repository_branch' => 'nullable|string|max:255',
            'branch' => 'nullable|string|max:255',
            'coolify_application_uuid' => 'nullable|string|max:255',
            'framework' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'domain' => 'nullable|string|max:255',
            'fqdn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'base_directory' => 'nullable|string|max:255',
            'install_command' => 'nullable|string|max:1000',
            'build_command' => 'nullable|string|max:1000',
            'start_command' => 'nullable|string|max:1000',
            'publish_directory' => 'nullable|string|max:255',
        ]);

        if (isset($validated['repository_branch']) && !isset($validated['branch'])) {
            $validated['branch'] = $validated['repository_branch'];
        }

        if (isset($validated['branch']) && !isset($validated['repository_branch'])) {
            $validated['repository_branch'] = $validated['branch'];
        }

        $project->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Project updated successfully',
            'data' => $project->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Project deleted successfully',
            'data' => null,
        ]);
    }

    public function deploy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        if (!$user->canDeployProject($project)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to deploy this project.',
            ], 403);
        }

        if (method_exists($project, 'canDeploy') && !$project->canDeploy()) {
            return response()->json([
                'success' => false,
                'message' => 'This project cannot be deployed right now.',
            ], 422);
        }

        $key = "deploy:{$user->id}:{$project->id}";

        if (RateLimiter::tooManyAttempts($key, config('services.coolify.deploy_rate_limit', 5))) {
            return response()->json([
                'success' => false,
                'message' => 'Too many deployment attempts. Please wait.',
            ], 429);
        }

        RateLimiter::hit($key, 300);

        $deployment = Deployment::create([
            'project_id' => $project->id,
            'status' => 'queued',
            'branch' => $project->repository_branch ?? $project->branch ?? 'main',
            'triggered_by_user_id' => $user->id,
            'trigger_type' => 'manual',
        ]);

        TriggerCoolifyDeploymentJob::dispatch($deployment, $project);

        if (class_exists(AuditLog::class) && method_exists(AuditLog::class, 'log')) {
            AuditLog::log('deployment.queued', [
                'project_id' => $project->id,
                'client_id' => $project->client_id,
                'description' => "Deployment queued by {$user->name}",
                'metadata' => ['deployment_id' => $deployment->id],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Deployment queued successfully',
            'data' => [
                'id' => $deployment->id,
                'status' => $deployment->status,
            ],
        ], 202);
    }

    public function deployments(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();

        if (!$user->canAccessProject($project)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $deployments = $project->deployments()
            ->with('triggeredBy:id,name')
            ->latest()
            ->get()
            ->map(fn ($deployment) => [
                'id' => $deployment->id,
                'status' => $deployment->status,
                'branch' => $deployment->branch ?? $project->repository_branch ?? $project->branch ?? 'main',
                'commit_hash' => $deployment->commit_hash ? substr($deployment->commit_hash, 0, 7) : null,
                'commit_message' => $deployment->commit_message,
                'triggered_by' => $deployment->triggeredBy?->name ?? 'System',
                'duration' => $deployment->started_at && $deployment->finished_at
                    ? $deployment->started_at->diffInSeconds($deployment->finished_at)
                    : null,
                'created_at' => $deployment->created_at->toISOString(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Deployments loaded successfully',
            'data' => $deployments,
        ]);
    }

    public function logs(Request $request, int $id, CoolifyService $coolify, LogSanitizer $sanitizer): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        try {
            $result = $coolify->getApplicationLogs($project, 200);

            if (!($result['success'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to fetch logs at this time.',
                    'data' => [
                        'logs' => 'Unable to fetch logs at this time.',
                        'is_summary' => false,
                    ],
                ]);
            }

            $logs = $user->isClient()
                ? $sanitizer->generateSummary($result['logs'])
                : $sanitizer->sanitize($result['logs']);

            return response()->json([
                'success' => true,
                'message' => 'Logs loaded successfully',
                'data' => [
                    'logs' => $logs,
                    'is_summary' => $user->isClient(),
                ],
            ]);
        } catch (\Throwable $exception) {
            Log::error('Project logs failed', [
                'project_id' => $project->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to fetch logs at this time.',
                'data' => [
                    'logs' => 'Unable to fetch logs at this time.',
                    'is_summary' => false,
                ],
            ]);
        }
    }
}
