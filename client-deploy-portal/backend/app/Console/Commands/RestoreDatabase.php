<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RestoreDatabase extends Command
{
    protected $signature = 'backup:restore
        {file : Path to backup file (relative to storage/app/backups or absolute)}
        {--force : Skip confirmation prompt}';

    protected $description = 'Restore a PostgreSQL database from backup (admin only)';

    public function handle(): int
    {
        $file = $this->argument('file');

        // Resolve path
        if (!str_starts_with($file, '/')) {
            $file = storage_path("app/backups/{$file}");
        }

        if (!file_exists($file)) {
            $this->error("❌ Backup file not found: {$file}");
            return Command::FAILURE;
        }

        $sizeHuman = $this->formatBytes(filesize($file));
        $this->warn("⚠️  You are about to restore from: " . basename($file) . " ({$sizeHuman})");
        $this->warn("   This will OVERWRITE the current database!");

        if (!$this->option('force') && !$this->confirm('Are you sure you want to proceed?')) {
            $this->info('Restore cancelled.');
            return Command::SUCCESS;
        }

        // Create a safety backup first
        $this->info('📦 Creating safety backup before restore...');
        $this->call('backup:database', ['--type' => 'manual']);

        $dbHost = config('database.connections.pgsql.host');
        $dbPort = config('database.connections.pgsql.port');
        $dbName = config('database.connections.pgsql.database');
        $dbUser = config('database.connections.pgsql.username');
        $dbPass = config('database.connections.pgsql.password');

        $isGzipped = str_ends_with($file, '.gz');

        // Build restore command
        if ($isGzipped) {
            $cmd = sprintf(
                'gunzip -c %s | PGPASSWORD=%s pg_restore -h %s -p %s -U %s -d %s --clean --if-exists',
                escapeshellarg($file),
                escapeshellarg($dbPass),
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbName)
            );
        } else {
            $cmd = sprintf(
                'PGPASSWORD=%s pg_restore -h %s -p %s -U %s -d %s --clean --if-exists %s',
                escapeshellarg($dbPass),
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbName),
                escapeshellarg($file)
            );
        }

        $exitCode = 0;
        $output = [];
        exec($cmd . ' 2>&1', $output, $exitCode);

        if ($exitCode !== 0) {
            $error = implode("\n", $output);
            $this->error("❌ Restore failed: {$error}");
            Log::error('Database restore failed', ['file' => $file, 'error' => $error]);
            return Command::FAILURE;
        }

        $this->info('✅ Database restored successfully from: ' . basename($file));
        Log::info('Database restored', ['file' => basename($file), 'by' => 'artisan']);

        return Command::SUCCESS;
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
