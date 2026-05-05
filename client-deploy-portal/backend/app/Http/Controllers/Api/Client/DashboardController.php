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
        $clientId = $user->client_id;

        if (!$clientId) {
            return response()->json(['message' => 'No client associated'], 403);
        }

        $projects = Project::forClient($clientId)->get();
        $projectIds = $projects->pluck('id');

        $totalProjects = $projects->count();
        $onlineProjects = $projects->where('status', 'active')->count();
        $failedDeployments = Deployment::whereIn('project_id', $projectIds)
            ->where('status', 'failed')
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        $lastDeployment = Deployment::whereIn('project_id', $projectIds)
            ->orderByDesc('created_at')
            ->first();

        $openTickets = SupportTicket::forClient($clientId)->open()->count();

        $recentDeployments = Deployment::whereIn('project_id', $projectIds)
            ->with('project:id,name,slug')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'project_name' => $d->project?->name,
                'status' => $d->status,
                'branch' => $d->branch,
                'commit_hash' => $d->short_commit_hash,
                'triggered_at' => $d->created_at->toISOString(),
                'duration' => $d->formatted_duration,
            ]);

        return response()->json([
            'stats' => [
                'total_projects' => $totalProjects,
                'online_projects' => $onlineProjects,
                'failed_deployments_7d' => $failedDeployments,
                'open_tickets' => $openTickets,
            ],
            'last_deployment' => $lastDeployment ? [
                'status' => $lastDeployment->status,
                'project' => $lastDeployment->project?->name,
                'time' => $lastDeployment->created_at->toISOString(),
            ] : null,
            'recent_deployments' => $recentDeployments,
        ]);
    }
}
