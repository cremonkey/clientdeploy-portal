<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with(['user:id,name,email', 'client:id,company_name', 'project:id,name'])
            ->when($request->action, fn($q, $a) => $q->where('action', $a))
            ->when($request->severity, fn($q, $s) => $q->where('severity', $s))
            ->when($request->user_id, fn($q, $u) => $q->where('user_id', $u))
            ->when($request->client_id, fn($q, $c) => $q->where('client_id', $c))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ]
        ]);
    }

    public function export(Request $request)
    {
        $logs = AuditLog::query()
            ->with(['user:id,name', 'client:id,company_name', 'project:id,name'])
            ->orderByDesc('created_at')
            ->limit(1000)
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="audit-logs-'.now()->format('Y-m-d').'.csv"',
        ];

        $callback = function() use ($logs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Timestamp', 'User', 'Client', 'Project', 'Action', 'Severity', 'Description', 'IP Address']);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->created_at->toDateTimeString(),
                    $log->user?->name ?? 'System',
                    $log->client?->company_name ?? 'N/A',
                    $log->project?->name ?? 'N/A',
                    $log->action,
                    $log->severity,
                    $log->description,
                    $log->ip_address
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
