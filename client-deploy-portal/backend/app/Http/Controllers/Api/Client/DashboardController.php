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
        ]);

        if ($isAdmin) {
            $projects = Project::query()->get();
        } else {
            $clientId = $user->client_id;

            if (!$clientId) {
                return response()->json(['message' => 'No client associated'], 403);
            }

            $projects = Project::forClient($clientId)->get();
        }

        $projectIds = $projects->pluck('id');

        $totalProjects = $projects->count();
        $onlineProjects = $projects->whereIn('status', ['active', 'success', 'running'])->count();

        $deployments7d = Deployment::whereIn('project_id', $projectIds)
            ->where('created_at', '>=', now()->subDays(7))
            ->get();

        $failedDeployments7d = $deployments7d->where('status', 'failed')->count();
        $successDeployments7d = $deployments7d->where('status', 'success')->count();
        
        $successRate = $deployments7d->count() > 0 
            ? round(($successDeployments7d / $deployments7d->count()) * 100, 1) 
            : 100;

        $avgDuration = $deployments7d->whereNotNull('started_at')->whereNotNull('finished_at')
            ->map(fn($d) => $d->started_at->diffInSeconds($d->finished_at))
            ->avg();

        $lastDeployment = Deployment::whereIn('project_id', $projectIds)
            ->with('project:id,name')
            ->orderByDesc('created_at')
            ->first();

        $openTickets = $isAdmin
            ? SupportTicket::open()->count()
            : SupportTicket::forClient($user->client_id)->open()->count();

        $recentDeployments = Deployment::whereIn('project_id', $projectIds)
            ->with(['project:id,name,slug', 'triggeredBy:id,name'])
            ->where(function($q) {
                $q->whereNotIn('status', ['failed'])
                  ->orWhere('created_at', '>=', now()->subHours(48));
            })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'project_name' => $d->project?->name,
                'project_slug' => $d->project?->slug,
                'status' => $d->status,
                'branch' => $d->branch ?? 'main',
                'commit_hash' => $d->commit_hash ? substr($d->commit_hash, 0, 7) : null,
                'triggered_by' => $d->triggeredBy?->name ?? 'System',
                'triggered_at' => $d->created_at->toISOString(),
                'duration' => $d->started_at && $d->finished_at ? $d->started_at->diffInSeconds($d->finished_at) : null,
            ]);

        $projectsRequiringAttention = $projects->whereIn('status', ['failed', 'stopped'])->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'status' => $p->status,
        ])->values();

        return response()->json([
            'stats' => [
                'total_projects' => $totalProjects,
                'online_projects' => $onlineProjects,
                'failed_deployments_7d' => $failedDeployments7d,
                'open_tickets' => $openTickets,
                'success_rate' => $successRate,
                'avg_duration' => round($avgDuration ?? 0),
            ],
            'last_deployment' => $lastDeployment ? [
                'status' => $lastDeployment->status,
                'project' => $lastDeployment->project?->name,
                'time' => $lastDeployment->created_at->toISOString(),
            ] : null,
            'recent_deployments' => $recentDeployments,
            'projects_requiring_attention' => $projectsRequiringAttention,
        ]);
    }


}
