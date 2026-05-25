<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('domain')->nullable()->after('repository_branch');
            $table->string('fqdn')->nullable()->after('domain');
            $table->text('description')->nullable()->after('fqdn');
            $table->string('branch')->nullable()->after('repository_branch');
            $table->string('publish_directory')->nullable()->after('base_directory');
            $table->string('last_deployment_status')->nullable()->after('last_deployed_at');
        });

        Schema::table('deployments', function (Blueprint $table) {
            $table->string('branch')->nullable()->after('status');
            $table->string('trigger_type')->nullable()->default('manual')->after('branch');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['domain', 'fqdn', 'description', 'branch', 'publish_directory', 'last_deployment_status']);
        });

        Schema::table('deployments', function (Blueprint $table) {
            $table->dropColumn(['branch', 'trigger_type']);
        });
    }
};
