<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database
        {--type=daily : Backup type: daily, weekly, manual}
        {--compress : Compress with gzip}';

    protected $description = 'Create a PostgreSQL database backup';

    public function handle(): int
    {
        $type = $this->option('type');
        $compress = $this->option('compress') || $type !== 'manual';
        $timestamp = now()->format('Y-m-d_His');
        $filename = "backup_{$type}_{$timestamp}.sql";

        $dbHost = config('database.connections.pgsql.host');
        $dbPort = config('database.connections.pgsql.port');
        $dbName = config('database.connections.pgsql.database');
        $dbUser = config('database.connections.pgsql.username');
        $dbPass = config('database.connections.pgsql.password');

        $backupDir = storage_path("app/backups/{$type}");
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0750, true);
        }

        $filePath = "{$backupDir}/{$filename}";

        $this->info("📦 Starting {$type} backup: {$filename}");

        // Build pg_dump command
        $cmd = sprintf(
            'PGPASSWORD=%s pg_dump -h %s -p %s -U %s -Fc %s > %s',
            escapeshellarg($dbPass),
            escapeshellarg($dbHost),
            escapeshellarg($dbPort),
            escapeshellarg($dbUser),
            escapeshellarg($dbName),
            escapeshellarg($filePath)
        );

        $exitCode = 0;
        $output = [];
        exec($cmd . ' 2>&1', $output, $exitCode);

        if ($exitCode !== 0) {
            $error = implode("\n", $output);
            $this->error("❌ Backup failed: {$error}");
            Log::error('Database backup failed', ['type' => $type, 'error' => $error]);
            return Command::FAILURE;
        }

        if ($compress) {
            exec("gzip {$filePath}");
            $filePath .= '.gz';
            $filename .= '.gz';
        }

        $size = filesize($filePath);
        $sizeHuman = $this->formatBytes($size);

        $this->info("✅ Backup created: {$filename} ({$sizeHuman})");
        Log::info('Database backup completed', [
            'type' => $type,
            'file' => $filename,
            'size' => $size,
        ]);

        // Cleanup old backups
        $this->cleanup($type, $backupDir);

        return Command::SUCCESS;
    }

    private function cleanup(string $type, string $dir): void
    {
        $retention = match ($type) {
            'daily' => 7,     // Keep 7 daily backups
            'weekly' => 4,    // Keep 4 weekly backups
            'manual' => 10,   // Keep 10 manual backups
            default => 7,
        };

        $files = glob("{$dir}/backup_*");
        if (count($files) <= $retention) {
            return;
        }

        usort($files, fn($a, $b) => filemtime($a) - filemtime($b));
        $toDelete = array_slice($files, 0, count($files) - $retention);

        foreach ($toDelete as $file) {
            unlink($file);
            $this->line("🗑  Deleted old backup: " . basename($file));
        }
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
