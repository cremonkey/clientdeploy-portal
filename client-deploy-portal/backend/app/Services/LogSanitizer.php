<?php

namespace App\Services;

class LogSanitizer
{
    /**
     * Layer 1: Regex patterns to catch secrets in various formats
     */
    private static array $regexPatterns = [
        // API keys and tokens (generic)
        '/(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|bearer|secret[_-]?key|private[_-]?key)\s*[:=]\s*["\']?([a-zA-Z0-9\-_.\/+=]{8,})["\']?/i',
        // Password patterns
        '/(?:password|passwd|pwd|secret)\s*[:=]\s*["\']?([^\s"\']{4,})["\']?/i',
        // Database URLs
        '/(?:postgres|mysql|redis|mongodb):\/\/[^\s"\']+/i',
        // JWT tokens
        '/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i',
        // Base64 encoded secrets (min 32 chars likely a secret)
        '/(?:secret|key|token|password)\s*[:=]\s*["\']?([A-Za-z0-9+\/]{32,}={0,2})["\']?/i',
        // AWS keys
        '/(?:AKIA|ASIA)[A-Z0-9]{16}/i',
        // Private keys
        '/-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/i',
        // SSH keys
        '/ssh-(?:rsa|ed25519|ecdsa)\s+[A-Za-z0-9+\/=]+/i',
        // IP addresses (internal networks)
        '/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/',
        // Server paths
        '/\/(?:var|home|etc|opt|srv|root)\/[^\s"\']+/i',
        // Email addresses in logs
        '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i',
        // Hex-encoded secrets (32+ chars)
        '/(?:secret|key|token)\s*[:=]\s*["\']?([0-9a-fA-F]{32,})["\']?/i',
        // .env file content
        '/^[A-Z_]+=.+$/m',
        // Docker secrets paths
        '/\/run\/secrets\/[^\s]+/i',
        // Connection strings
        '/(?:Server|Data Source|Host)\s*=\s*[^;]+;/i',
    ];

    /**
     * Layer 2: Deny-list keywords — entire line is redacted if found
     */
    private static array $denyListKeywords = [
        'COOLIFY_API', 'COOLIFY_TOKEN', 'DB_PASSWORD', 'REDIS_PASSWORD',
        'APP_KEY', 'JWT_SECRET', 'ENCRYPTION_KEY', 'MAIL_PASSWORD',
        'AWS_SECRET', 'STRIPE_SECRET', 'WEBHOOK_SECRET', 'PRIVATE_KEY',
        'client_secret', 'access_token', 'refresh_token', 'id_rsa',
        'BEGIN PRIVATE', 'BEGIN RSA', 'authorized_keys', '.pem',
        'POSTGRES_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'MONGO_PASSWORD',
    ];

    /**
     * Layer 3: Allowlist — only show lines matching safe patterns
     */
    private static array $safeLinePatterns = [
        '/^\[?\d{4}[-\/]\d{2}[-\/]\d{2}/', // Timestamped lines
        '/^(INFO|WARN|ERROR|DEBUG|NOTICE)/i', // Log level prefixes
        '/^(Step|Building|Deploying|Installing|Running|Starting|Finished|Done|Success|Failed|Pulling|Pushing|Created|Removed|Restarting)/i',
        '/^(npm|yarn|composer|pip|cargo|go)\s+(install|run|build|test)/i',
        '/^#\d+\s/', // Docker build step numbers
        '/^\s*$/', // Empty lines (preserve formatting)
    ];

    /**
     * Sanitize raw logs — returns safe, client-friendly output
     */
    public static function sanitize(string $rawLogs, bool $summaryOnly = false): string
    {
        if (empty($rawLogs)) {
            return 'No logs available.';
        }

        if ($summaryOnly) {
            return self::generateSummary($rawLogs);
        }

        $lines = explode("\n", $rawLogs);
        $sanitized = [];

        foreach ($lines as $line) {
            $processed = self::processLine($line);
            if ($processed !== null) {
                $sanitized[] = $processed;
            }
        }

        $result = implode("\n", $sanitized);

        // Final pass: ensure nothing slipped through
        $result = self::finalSweep($result);

        return $result ?: 'Logs sanitized — no displayable content.';
    }

    /**
     * Generate a high-level summary instead of raw logs
     * This is the SAFEST option for client-facing display
     */
    public static function generateSummary(string $rawLogs): string
    {
        $lines = explode("\n", $rawLogs);
        $totalLines = count($lines);

        $errors = 0;
        $warnings = 0;
        $steps = [];
        $lastTimestamp = null;
        $duration = null;

        foreach ($lines as $line) {
            $lower = strtolower($line);

            if (str_contains($lower, 'error') || str_contains($lower, 'fatal') || str_contains($lower, 'exception')) {
                $errors++;
            }
            if (str_contains($lower, 'warn')) {
                $warnings++;
            }

            // Capture build steps
            if (preg_match('/^(Step \d+|Building|Deploying|Installing|Running|Finished|Done|Success|Failed)/i', $line, $m)) {
                $steps[] = trim($m[0]);
            }

            // Capture timestamps
            if (preg_match('/(\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2})/', $line, $m)) {
                $lastTimestamp = $m[1];
            }
        }

        $summary = "📋 Deployment Log Summary\n";
        $summary .= "─────────────────────────\n";
        $summary .= "Total log lines: {$totalLines}\n";
        $summary .= "Errors: {$errors}\n";
        $summary .= "Warnings: {$warnings}\n";

        if ($lastTimestamp) {
            $summary .= "Last activity: {$lastTimestamp}\n";
        }

        if (!empty($steps)) {
            $summary .= "\n📌 Key Steps:\n";
            $uniqueSteps = array_unique(array_slice($steps, 0, 15));
            foreach ($uniqueSteps as $step) {
                $summary .= "  → {$step}\n";
            }
        }

        if ($errors > 0) {
            $summary .= "\n⚠️  {$errors} error(s) detected. Contact support for details.\n";
        }

        return $summary;
    }

    /**
     * Process a single line through all layers
     */
    private static function processLine(string $line): ?string
    {
        // Layer 2: Deny-list check — kill entire line
        foreach (self::$denyListKeywords as $keyword) {
            if (stripos($line, $keyword) !== false) {
                return '[REDACTED — sensitive configuration]';
            }
        }

        // Layer 1: Regex replacement
        foreach (self::$regexPatterns as $pattern) {
            $line = preg_replace($pattern, '[REDACTED]', $line);
        }

        return $line;
    }

    /**
     * Final sweep — catch anything missed
     */
    private static function finalSweep(string $text): string
    {
        // Remove any remaining long hex/base64 strings that look like secrets
        $text = preg_replace('/[a-zA-Z0-9+\/=]{64,}/', '[REDACTED-LONG-STRING]', $text);

        // Remove any remaining key=value patterns with long values
        $text = preg_replace('/[A-Z_]{3,}=[^\s]{20,}/', '[REDACTED-ENV]', $text);

        return $text;
    }
}
