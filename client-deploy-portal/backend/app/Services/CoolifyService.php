<?php

namespace App\Services;

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


    public function deployments(string $uuid): array
    {
        return $this->request('GET', "/deployments/applications/{$uuid}");
    }

    public function getApplicationLogs(Project $project, int $lines = 200): array
    {
        try {
            $response = $this->request('GET', "/applications/{$project->coolify_application_uuid}/logs?lines={$lines}");
            
            return [
                'success' => true,
                'logs' => $response['logs'] ?? $response ?? '',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
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
