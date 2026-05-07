<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\EnvironmentVariable;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnvironmentVariableController extends Controller
{
    public function index(Request $request, int $projectId): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($projectId);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $envVars = $project->environmentVariables()
            ->when($user->isClient(), fn($q) => $q->visibleToClient())
            ->get()
            ->map(fn($ev) => [
                'id' => $ev->id,
                'key' => $ev->key,
                'value' => $ev->is_sensitive ? '••••••••' : $ev->value_encrypted,
                'is_sensitive' => $ev->is_sensitive,
                'is_client_editable' => $ev->is_client_editable,
            ]);

        return response()->json(['env_vars' => $envVars]);
    }

    public function store(Request $request, int $projectId): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($projectId);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isClient() && !$user->canDeployProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'key' => 'required|string|max:255',
            'value' => 'required|string',
            'is_sensitive' => 'boolean',
            'is_visible_to_client' => 'boolean',
            'is_client_editable' => 'boolean',
        ]);

        $envVar = $project->environmentVariables()->create([
            'key' => $validated['key'],
            'value_encrypted' => $validated['value'],
            'is_sensitive' => $validated['is_sensitive'] ?? false,
            'is_visible_to_client' => $validated['is_visible_to_client'] ?? true,
            'is_client_editable' => $validated['is_client_editable'] ?? true,
        ]);

        return response()->json(['env_var' => $envVar], 201);
    }

    public function update(Request $request, int $projectId, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($projectId);
        $envVar = EnvironmentVariable::where('project_id', $projectId)->findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isClient() && (!$envVar->is_client_editable || !$user->canDeployProject($project))) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'value' => 'sometimes|string',
            'is_sensitive' => 'sometimes|boolean',
            'is_visible_to_client' => 'sometimes|boolean',
            'is_client_editable' => 'sometimes|boolean',
        ]);

        if (isset($validated['value'])) {
            $envVar->value_encrypted = $validated['value'];
        }
        
        $envVar->update(collect($validated)->except('value')->toArray());

        return response()->json(['env_var' => $envVar]);
    }

    public function destroy(Request $request, int $projectId, int $id): JsonResponse
    {
        $user = $request->user();
        $project = Project::findOrFail($projectId);
        $envVar = EnvironmentVariable::where('project_id', $projectId)->findOrFail($id);

        if (!$user->canAccessProject($project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isClient() && (!$envVar->is_client_editable || !$user->canDeployProject($project))) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $envVar->delete();

        return response()->json(['message' => 'Environment variable deleted']);
    }
}
