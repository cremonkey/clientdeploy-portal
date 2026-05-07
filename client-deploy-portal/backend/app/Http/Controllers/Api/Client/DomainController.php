<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\Project;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DomainController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        return response()->json(['data' => $project->domains]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'domain' => 'required|string|unique:domains,domain',
            'type' => 'required|in:primary,alias,redirect',
        ]);

        $domain = $project->domains()->create([
            'domain' => $validated['domain'],
            'type' => $validated['type'],
            'ssl_status' => 'pending',
            'verification_status' => 'pending',
        ]);

        AuditLog::log('domain.added', [
            'project_id' => $project->id,
            'description' => "Added domain {$domain->domain} to project {$project->name}",
        ]);

        return response()->json(['data' => $domain], 201);
    }

    public function destroy(Project $project, Domain $domain): JsonResponse
    {
        $domainName = $domain->domain;
        $domain->delete();

        AuditLog::log('domain.removed', [
            'project_id' => $project->id,
            'description' => "Removed domain {$domainName} from project {$project->name}",
        ]);

        return response()->json(null, 204);
    }
}
