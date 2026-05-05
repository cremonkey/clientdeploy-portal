<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('monthly_price')->default(0); // in cents
            $table->integer('storage_limit_mb')->default(1024);
            $table->integer('project_limit')->default(1);
            $table->integer('deployment_limit_per_day')->default(10);
            $table->string('support_level')->default('basic');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('slug')->unique();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('billing_email')->nullable();
            $table->string('phone')->nullable();
            $table->string('country')->nullable();
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->string('status')->default('active'); // active, suspended
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Add client_id to users table now that clients table exists
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug');
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('coolify_uuid')->nullable()->index();
            $table->string('coolify_resource_id')->nullable();
            $table->string('domain')->nullable();
            $table->string('type')->default('application');
            $table->string('framework')->nullable();
            $table->string('repository_url')->nullable();
            $table->string('branch')->default('main');
            $table->string('status')->default('draft'); // draft, running, stopped, failed, pending
            $table->text('description')->nullable();
            $table->timestamp('last_deployed_at')->nullable();
            $table->string('last_deployment_status')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['client_id', 'slug']);
        });

        Schema::create('deployments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('coolify_deployment_uuid')->nullable()->index();
            $table->string('status')->default('queued'); // queued, building, success, failed
            $table->string('branch')->nullable();
            $table->string('commit_hash')->nullable();
            $table->text('commit_message')->nullable();
            $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('trigger_type')->default('manual'); // manual, webhook
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('domain');
            $table->string('type')->default('custom'); // custom, system
            $table->boolean('is_primary')->default(false);
            $table->string('ssl_status')->default('pending'); // pending, active, failed
            $table->timestamps();
        });

        Schema::create('environment_variables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('key');
            $table->text('value')->nullable();
            $table->boolean('is_secret')->default(false);
            $table->string('coolify_uuid')->nullable();
            $table->timestamps();
            $table->unique(['project_id', 'key']);
        });

        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject');
            $table->text('message');
            $table->string('status')->default('open'); // open, in_progress, resolved, closed
            $table->string('priority')->default('medium'); // low, medium, high, urgent
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('ticket_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->boolean('is_staff_reply')->default(false);
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->nullable()->constrained('clients')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('ticket_replies');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('environment_variables');
        Schema::dropIfExists('domains');
        Schema::dropIfExists('deployments');
        Schema::dropIfExists('projects');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropColumn('client_id');
        });
        Schema::dropIfExists('clients');
        Schema::dropIfExists('plans');
    }
};
