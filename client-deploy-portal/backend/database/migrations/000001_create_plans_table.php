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
            $table->integer('monthly_price')->default(0);
            $table->integer('yearly_price')->nullable();
            $table->integer('storage_limit_mb')->default(1024);
            $table->integer('project_limit')->default(1);
            $table->integer('deployment_limit_per_day')->default(5);
            $table->string('support_level')->default('basic');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
