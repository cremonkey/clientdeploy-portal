<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->boolean('is_primary')->default(false)->after('domain');
            $table->unique(['project_id', 'domain']);
        });
    }

    public function down(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->dropUnique(['project_id', 'domain']);
            $table->dropColumn('is_primary');
        });
    }
};
