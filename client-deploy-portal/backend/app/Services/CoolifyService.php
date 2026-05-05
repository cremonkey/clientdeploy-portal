<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Deployment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\PendingRequest;

class CoolifyService
{
    private string $baseUrl;
    private string $apiToken;
    private int $timeout = 30;
    private int $retryTimes = 3;
    private int $retryDelay = 1000;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.coolify.base_url'), '/');
        $this->apiToken = config('services.coolify.api_token');

        if (empty($this->baseUrl) || empty($this->apiToken)) {
            throw new \RuntimeException('Coolify configuration is incomplete. Set COOLIFY_BASE_URL and COOLIFY_API_TOKEN.');
        }
    }

    // ─── HTTP Client ───

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl . '/api/v1')
            ->withToken($this->apiToken)
            ->timeout($this->timeout)
            ->retry($this->retryTimes, $this->retryDelay, function ($exception) {
                return $exception instanceof \Illuminate\Http\Client\ConnectionException;
            })
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ]);
    }

    // ─── Connection Validation ───

    public function validateConnection(): array
    {
        try {
            $response = $this->client()->get('/healthcheck');
            return [
                'connected' => $response->successful(),
                'status' => $response->status(),
                'message' => $response->successful() ? 'Connected successfully' : 'Connection failed',
            ];
        } catch (\Exception $e) {
            Log::error('Coolify connection failed', ['error' => $e->getMessage()]);
            return ['connected' => false, 'status' => 0, 'message' => $e->getMessage()];
        }
    }

    // ─── Application Operations ───

    public function getApplicationStatus(Project $project): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->get("/applications/{$project->coolify_application_uuid}");

            if ($response->failed()) {
                Log::warning('Failed to get app status', [
                    'project_id' => $project->id,
                    'status' => $response->status(),
                ]);
                return ['status' => 'unknown', 'error' => 'API request failed'];
            }

            $data = $response->json();
            return [
                'status' => $data['status'] ?? 'unknown',
                'fqdn' => $data['fqdn'] ?? null,
                'repository' => $data['git_repository'] ?? null,
                'branch' => $data['git_branch'] ?? null,
                'build_pack' => $data['build_pack'] ?? null,
            ];
        } catch (\Exception $e) {
            Log::error('Coolify getApplicationStatus failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    public function triggerDeployment(Project $project): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->post(
                "/applications/{$project->coolify_application_uuid}/deploy",
                ['force' => false]
            );

            if ($response->failed()) {
                Log::error('Coolify deployment trigger failed', [
                    'project_id' => $project->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return ['success' => false, 'error' => 'Deployment trigger failed'];
            }

            $data = $response->json();
            Log::info('Coolify deployment triggered', [
                'project_id' => $project->id,
                'deployment_uuid' => $data['deployment_uuid'] ?? null,
            ]);

            return [
                'success' => true,
                'deployment_uuid' => $data['deployment_uuid'] ?? null,
                'message' => $data['message'] ?? 'Deployment started',
            ];
        } catch (\Exception $e) {
            Log::error('Coolify triggerDeployment failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function restartApplication(Project $project): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->post(
                "/applications/{$project->coolify_application_uuid}/restart"
            );
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            Log::error('Coolify restart failed', ['project_id' => $project->id, 'error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function stopApplication(Project $project): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->post(
                "/applications/{$project->coolify_application_uuid}/stop"
            );
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            Log::error('Coolify stop failed', ['project_id' => $project->id, 'error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ─── Deployment Logs ───

    public function getDeploymentLogs(Project $project, string $deploymentUuid): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->get("/deployments/{$deploymentUuid}");

            if ($response->failed()) {
                return ['success' => false, 'error' => 'Failed to fetch logs'];
            }

            $data = $response->json();
            return [
                'success' => true,
                'status' => $data['status'] ?? 'unknown',
                'logs' => $data['logs'] ?? '',
            ];
        } catch (\Exception $e) {
            Log::error('Coolify getDeploymentLogs failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getApplicationLogs(Project $project, int $lines = 100): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->get(
                "/applications/{$project->coolify_application_uuid}/logs",
                ['lines' => $lines]
            );
            return [
                'success' => $response->successful(),
                'logs' => $response->successful() ? $response->json('logs', '') : '',
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'logs' => '', 'error' => $e->getMessage()];
        }
    }

    // ─── Environment Variables ───

    public function listEnvironmentVariables(Project $project): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->get(
                "/applications/{$project->coolify_application_uuid}/envs"
            );
            return ['success' => $response->successful(), 'variables' => $response->json() ?? []];
        } catch (\Exception $e) {
            return ['success' => false, 'variables' => [], 'error' => $e->getMessage()];
        }
    }

    public function updateEnvironmentVariable(Project $project, string $key, string $value, bool $isBuildTime = false): array
    {
        $this->ensureCoolifyUuid($project);

        try {
            $response = $this->client()->patch(
                "/applications/{$project->coolify_application_uuid}/envs",
                [
                    'key' => $key,
                    'value' => $value,
                    'is_build_time' => $isBuildTime,
                    'is_preview' => false,
                ]
            );

            Log::info('Coolify env variable updated', [
                'project_id' => $project->id,
                'key' => $key,
            ]);

            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ─── Deployment Status Sync ───

    public function syncDeploymentStatus(Project $project): void
    {
        $runningDeployments = $project->deployments()
            ->whereIn('status', ['queued', 'building', 'deploying'])
            ->whereNotNull('coolify_deployment_uuid')
            ->get();

        foreach ($runningDeployments as $deployment) {
            $result = $this->getDeploymentLogs($project, $deployment->coolify_deployment_uuid);

            if ($result['success']) {
                $newStatus = $this->mapCoolifyStatus($result['status'] ?? 'unknown');

                if ($newStatus !== $deployment->status) {
                    if (in_array($newStatus, ['success', 'failed'])) {
                        $method = $newStatus === 'success' ? 'markAsSuccess' : 'markAsFailed';
                        $deployment->$method(
                            $newStatus === 'failed' ? ($result['error'] ?? null) : null,
                            substr($result['logs'] ?? '', -2000) // last 2000 chars as summary
                        );

                        $project->update([
                            'last_deployment_status' => $newStatus,
                            'last_deployed_at' => now(),
                            'status' => $newStatus === 'success' ? 'active' : 'failed',
                        ]);
                    } else {
                        $deployment->update(['status' => $newStatus]);
                    }
                }
            }
        }
    }

    // ─── Helpers ───

    private function ensureCoolifyUuid(Project $project): void
    {
        if (empty($project->coolify_application_uuid)) {
            throw new \InvalidArgumentException(
                "Project [{$project->id}] does not have a Coolify application UUID configured."
            );
        }
    }

    private function mapCoolifyStatus(string $coolifyStatus): string
    {
        return match (strtolower($coolifyStatus)) {
            'queued', 'waiting' => 'queued',
            'building', 'in_progress' => 'building',
            'deploying' => 'deploying',
            'finished', 'running', 'healthy' => 'success',
            'failed', 'error', 'cancelled' => 'failed',
            default => 'queued',
        };
    }
}
