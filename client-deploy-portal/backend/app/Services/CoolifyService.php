<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;

class CoolifyService
{
    protected string $baseUrl;
    protected string $apiToken;

    public function __construct()
    {
        $this->baseUrl = (string) config('services.coolify.base_url');
        $this->apiToken = (string) config('services.coolify.token');

        if (empty($this->baseUrl)) {
            throw new \Exception('Coolify base URL is missing.');
        }

        if (empty($this->apiToken)) {
            throw new \Exception('Coolify API token is missing.');
        }
    }

    public function version(): string
    {
        return $this->requestRaw('GET', '/version');
    }

    public function deployApplication(string $uuid): array
    {
        return $this->request('GET', "/deploy?uuid={$uuid}");
    }


public function triggerDeployment(string $uuid): array
{
    try {
        $response = $this->deployApplication($uuid);

        return [
            'success' => true,
            'deployment_uuid' => $response['deployment_uuid'] ?? $response['uuid'] ?? null,
            'response' => $response,
        ];
    } catch (\Throwable $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
        ];
    }
}


public function deploymentStatus(string $applicationUuid): array
{
    $data = $this->deployments($applicationUuid);

    return $data['deployments'][0] ?? [];
}


    public function getService(string $uuid): array
    {
        return $this->request('GET', "/services/{$uuid}");
    }

    public function deployments(string $uuid): array
    {
        return $this->request('GET', "/deployments/applications/{$uuid}");
    }

    public function getApplicationLogs(Project $project, int $lines = 200): array
    {
        try {
            $uuid = $project->coolify_application_uuid;

            // Try Coolify application logs endpoint first (works for standalone apps)
            try {
                $response = $this->request('GET', "/applications/{$uuid}/logs?lines={$lines}");
                return ['success' => true, 'logs' => $response['logs'] ?? $response ?? ''];
            } catch (\Throwable) {
                // UUID likely belongs to a service; fall through to Docker socket
            }

            // Fall back to Docker socket — find containers for this service UUID
            return $this->getDockerContainerLogs($uuid, $lines);
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function getDockerContainerLogs(string $serviceUuid, int $lines): array
    {
        $socketPath = '/var/run/docker.sock';
        if (! file_exists($socketPath)) {
            return ['success' => false, 'error' => 'Logs unavailable: Docker socket not accessible.'];
        }

        // Find containers whose name contains the service UUID; prefer *-backend-*
        $listRaw = shell_exec("curl -s --unix-socket {$socketPath} 'http://localhost/v1.41/containers/json?all=false' 2>/dev/null");
        $containers = json_decode($listRaw ?? '[]', true) ?? [];

        $target = null;
        foreach ($containers as $c) {
            $name = implode(' ', $c['Names'] ?? []);
            if (str_contains($name, $serviceUuid)) {
                if (str_contains($name, 'backend') || str_contains($name, 'api')) {
                    $target = ltrim($c['Names'][0] ?? '', '/');
                    break;
                }
                if ($target === null) {
                    $target = ltrim($c['Names'][0] ?? '', '/');
                }
            }
        }

        if (! $target) {
            return ['success' => false, 'error' => 'No running containers found for this service.'];
        }

        $logs = shell_exec("curl -s --unix-socket {$socketPath} 'http://localhost/v1.41/containers/" . urlencode($target) . "/logs?stdout=true&stderr=true&tail={$lines}&timestamps=false' 2>/dev/null");

        // Docker log stream prefixes each line with an 8-byte header — strip them
        $cleaned = preg_replace('/[\x00-\x07].{7}/s', '', $logs ?? '');

        return ['success' => true, 'logs' => trim($cleaned)];
    }

    private function request(string $method, string $endpoint): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiToken,
            'Accept' => 'application/json',
        ])
            ->baseUrl($this->baseUrl)
            ->send($method, $endpoint);

        if (! $response->successful()) {
            throw new \Exception('Coolify API Error: ' . $response->status() . ' - ' . $response->body());
        }

        return $response->json() ?? [];
    }

    private function requestRaw(string $method, string $endpoint): string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiToken,
            'Accept' => 'application/json',
        ])
            ->baseUrl($this->baseUrl)
            ->send($method, $endpoint);

        if (! $response->successful()) {
            throw new \Exception('Coolify API Error: ' . $response->status() . ' - ' . $response->body());
        }

        return trim($response->body());
    }
}
