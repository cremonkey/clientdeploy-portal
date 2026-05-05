<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('type')->default('unknown');
            $table->string('repository_url')->nullable();
            $table->string('repository_branch')->nullable();
            $table->string('coolify_project_uuid')->nullable();
            $table->string('coolify_application_uuid')->nullable();
            $table->string('status')->default('draft');
            $table->string('framework')->nullable();
            $table->string('build_command')->nullable();
            $table->string('install_command')->nullable();
            $table->string('start_command')->nullable();
            $table->string('base_directory')->nullable();
            $table->string('coolify_webhook_url')->nullable();
            $table->string('coolify_deploy_key')->nullable();
            $table->timestamp('last_deployed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
