<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Deployment;
use App\Models\Project;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $isAdmin = in_array($user->role, [
            'super_admin',
            'agency_admin',
            'developer',
        ], true);

        $projectsQuery = Project::query();

        if (!$isAdmin) {
            if (!$user->client_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No client associated',
                    'data' => null,
                ], 403);
            }

            $projectsQuery->where('client_id', $user->client_id);
        }

        $projects = $projectsQuery->get();
        $projectIds = $projects->pluck('id');

        $totalProjects = $projects->count();

        $onlineProjects = $projects
            ->whereIn('status', ['active', 'success', 'running', 'online'])
            ->count();

        $deployments7d = Deployment::whereIn('project_id', $projectIds)
            ->where('created_at', '>=', now()->subDays(7))
            ->get();

        $validDeployments7d = $deployments7d->filter(fn ($deployment) =>
            in_array($deployment->status, ['success', 'failed'], true)
        );

        $failedDeployments7d = $validDeployments7d
            ->where('status', 'failed')
            ->count();

        $successDeployments7d = $validDeployments7d
            ->where('status', 'success')
            ->count();

        $successRate = $validDeployments7d->count() > 0
            ? round(($successDeployments7d / $validDeployments7d->count()) * 100, 1)
            : 100;

        $averageDuration = $validDeployments7d
            ->filter(fn ($deployment) => $deployment->started_at && $deployment->finished_at)
            ->map(fn ($deployment) => $deployment->started_at->diffInSeconds($deployment->finished_at))
            ->avg();

        $lastDeployment = Deployment::whereIn('project_id', $projectIds)
            ->with('project:id,name,slug')
            ->orderByDesc('created_at')
            ->first();

        $recentDeployments = Deployment::whereIn('project_id', $projectIds)
            ->with(['project:id,name,slug', 'triggeredBy:id,name'])
            ->whereIn('id', function ($query) use ($projectIds) {
                $query->selectRaw('MAX(id)')
                    ->from('deployments')
                    ->whereIn('project_id', $projectIds)
                    ->groupBy('project_id');
            })
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(fn ($deployment) => [
                'id' => $deployment->id,
                'project_id' => $deployment->project_id,
                'project_name' => $deployment->project?->name,
                'project_slug' => $deployment->project?->slug,
                'status' => $deployment->status,
                'branch' => $deployment->branch ?? 'main',
                'commit_hash' => $deployment->commit_hash
                    ? substr($deployment->commit_hash, 0, 7)
                    : null,
                'triggered_by' => $deployment->triggeredBy?->name ?? 'System',
                'triggered_at' => $deployment->created_at->toISOString(),
                'duration' => $deployment->started_at && $deployment->finished_at
                    ? $deployment->started_at->diffInSeconds($deployment->finished_at)
                    : null,
            ])
            ->values();

        $latestDeploymentsByProject = Deployment::whereIn('project_id', $projectIds)
            ->whereIn('id', function ($query) use ($projectIds) {
                $query->selectRaw('MAX(id)')
                    ->from('deployments')
                    ->whereIn('project_id', $projectIds)
                    ->groupBy('project_id');
            })
            ->get()
            ->keyBy('project_id');

        $projectsRequiringAttention = $projects
            ->filter(function ($project) use ($latestDeploymentsByProject) {
                $latestDeployment = $latestDeploymentsByProject->get($project->id);

                return in_array($project->status, ['failed', 'stopped', 'offline'], true)
                    || ($latestDeployment && $latestDeployment->status === 'failed');
            })
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'latest_deployment_status' => $latestDeploymentsByProject->get($project->id)?->status,
            ])
            ->values();

        $openTickets = $isAdmin
            ? SupportTicket::open()->count()
            : SupportTicket::forClient($user->client_id)->open()->count();

        return response()->json([
            'success' => true,
            'message' => 'Dashboard loaded successfully',
            'data' => [
                'stats' => [
                    'total_projects' => $totalProjects,
                    'online_projects' => $onlineProjects,
                    'failed_deployments_7d' => $failedDeployments7d,
                    'open_tickets' => $openTickets,
                    'success_rate' => $successRate,
                    'average_duration' => round($averageDuration ?? 0),
                ],
                'latest_deployment' => $lastDeployment ? [
                    'id' => $lastDeployment->id,
                    'status' => $lastDeployment->status,
                    'project_id' => $lastDeployment->project_id,
                    'project_name' => $lastDeployment->project?->name,
                    'project_slug' => $lastDeployment->project?->slug,
                    'triggered_at' => $lastDeployment->created_at->toISOString(),
                ] : null,
                'recent_deployments' => $recentDeployments,
                'projects_requiring_attention' => $projectsRequiringAttention,
            ],
        ]);
    }
}
