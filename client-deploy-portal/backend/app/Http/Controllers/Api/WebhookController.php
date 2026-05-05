<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Deployment;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function coolify(Request $request): JsonResponse
    {
        // Verify webhook secret
        $secret = config('services.coolify.webhook_secret');
        if ($secret) {
            $signature = $request->header('X-Webhook-Secret');
            if ($signature !== $secret) {
                Log::warning('Coolify webhook: invalid signature');
                return response()->json(['message' => 'Invalid signature'], 401);
            }
        }

        $payload = $request->all();
        $eventType = $payload['event'] ?? $payload['type'] ?? 'unknown';
        $applicationUuid = $payload['application_uuid'] ?? $payload['uuid'] ?? null;
        $deploymentUuid = $payload['deployment_uuid'] ?? null;
        $status = $payload['status'] ?? null;

        Log::info('Coolify webhook received', [
            'event' => $eventType,
            'application_uuid' => $applicationUuid,
            'deployment_uuid' => $deploymentUuid,
            'status' => $status,
        ]);

        // Find the project
        $project = null;
        if ($applicationUuid) {
            $project = Project::where('coolify_application_uuid', $applicationUuid)->first();
        }

        if (!$project) {
            Log::warning('Coolify webhook: project not found', ['uuid' => $applicationUuid]);
            return response()->json(['message' => 'Project not found'], 404);
        }

        // Handle deployment status updates
        if ($deploymentUuid && $status) {
            $deployment = Deployment::where('coolify_deployment_uuid', $deploymentUuid)->first();

            if ($deployment) {
                $mappedStatus = $this->mapStatus($status);

                if (in_array($mappedStatus, ['success', 'failed'])) {
                    $method = $mappedStatus === 'success' ? 'markAsSuccess' : 'markAsFailed';
                    $deployment->$method(
                        $mappedStatus === 'failed' ? ($payload['error'] ?? null) : null
                    );

                    $project->update([
                        'status' => $mappedStatus === 'success' ? 'active' : 'failed',
                        'last_deployment_status' => $mappedStatus,
                        'last_deployed_at' => now(),
                    ]);
                } else {
                    $deployment->update(['status' => $mappedStatus]);
                }
            }
        }

        AuditLog::log('webhook.coolify', [
            'project_id' => $project->id,
            'client_id' => $project->client_id,
            'description' => "Coolify webhook: {$eventType}",
            'metadata' => [
                'event' => $eventType,
                'status' => $status,
                'deployment_uuid' => $deploymentUuid,
            ],
        ]);

        return response()->json(['message' => 'Webhook processed']);
    }

    private function mapStatus(string $status): string
    {
        return match (strtolower($status)) {
            'queued', 'waiting' => 'queued',
            'building', 'in_progress' => 'building',
            'deploying' => 'deploying',
            'finished', 'running', 'healthy' => 'success',
            'failed', 'error', 'cancelled' => 'failed',
            default => 'queued',
        };
    }
}
