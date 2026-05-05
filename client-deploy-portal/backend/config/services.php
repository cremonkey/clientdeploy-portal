<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Coolify Integration
    |--------------------------------------------------------------------------
    */
    'coolify' => [
        'base_url' => env('COOLIFY_BASE_URL', 'https://coolify.yourdomain.com'),
        'token' => env('COOLIFY_API_TOKEN', ''),
        'webhook_secret' => env('COOLIFY_WEBHOOK_SECRET', ''),
        'webhook_allowed_ips' => env('COOLIFY_WEBHOOK_ALLOWED_IPS', ''), // comma-separated, supports CIDR

        // Deployment limits
        'max_deploys_per_hour' => env('DEPLOY_MAX_PER_HOUR', 5),
        'max_concurrent_per_client' => env('DEPLOY_MAX_CONCURRENT', 2),
        'deploy_cooldown_seconds' => env('DEPLOY_COOLDOWN', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Monitoring / Alerting
    |--------------------------------------------------------------------------
    */
    'sentry' => [
        'dsn' => env('SENTRY_LARAVEL_DSN'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Laravel Services
    |--------------------------------------------------------------------------
    */
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
