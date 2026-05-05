<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environment_variables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('key');
            $table->text('value_encrypted');
            $table->boolean('is_sensitive')->default(false);
            $table->boolean('is_client_editable')->default(true);
            $table->boolean('is_visible_to_client')->default(true);
            $table->boolean('is_synced_to_coolify')->default(false);
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environment_variables');
    }
};
