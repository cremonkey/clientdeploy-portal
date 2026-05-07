<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        $clients = Client::query()
            ->withCount(['projects', 'users'])
            ->orderBy('company_name')
            ->get();

        return response()->json(['data' => $clients]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'status' => 'required|in:active,inactive,suspended',
        ]);

        $client = Client::create($validated);

        AuditLog::log('client.created', [
            'client_id' => $client->id,
            'description' => "Created new client: {$client->company_name}",
            'severity' => 'warning'
        ]);

        return response()->json(['data' => $client], 201);
    }

    public function show(Client $client): JsonResponse
    {
        $client->load(['projects', 'users']);
        return response()->json(['data' => $client]);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'status' => 'required|in:active,inactive,suspended',
        ]);

        $client->update($validated);

        AuditLog::log('client.updated', [
            'client_id' => $client->id,
            'description' => "Updated client info: {$client->company_name}",
        ]);

        return response()->json(['data' => $client]);
    }

    public function destroy(Client $client): JsonResponse
    {
        $companyName = $client->company_name;
        $client->delete();

        AuditLog::log('client.deleted', [
            'description' => "Deleted client: {$companyName}",
            'severity' => 'danger'
        ]);

        return response()->json(null, 204);
    }
}
