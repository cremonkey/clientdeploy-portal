<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create plans
        $starterPlan = Plan::create([
            'name' => 'Starter', 'slug' => 'starter', 'description' => 'Perfect for small sites',
            'monthly_price' => 999, 'storage_limit_mb' => 2048, 'project_limit' => 1,
            'deployment_limit_per_day' => 5, 'support_level' => 'basic', 'sort_order' => 1,
        ]);

        $proPlan = Plan::create([
            'name' => 'Professional', 'slug' => 'professional', 'description' => 'For growing businesses',
            'monthly_price' => 2999, 'storage_limit_mb' => 10240, 'project_limit' => 5,
            'deployment_limit_per_day' => 20, 'support_level' => 'priority', 'sort_order' => 2,
        ]);

        Plan::create([
            'name' => 'Enterprise', 'slug' => 'enterprise', 'description' => 'Unlimited power',
            'monthly_price' => 9999, 'storage_limit_mb' => 51200, 'project_limit' => 25,
            'deployment_limit_per_day' => 100, 'support_level' => 'premium', 'sort_order' => 3,
        ]);

        // Super Admin
        $admin = User::create([
            'name' => 'Super Admin', 'email' => 'admin@creativemonkey.agency',
            'password' => Hash::make('Admin@2026!'), 'role' => 'super_admin',
            'status' => 'active', 'email_verified_at' => now(),
        ]);

        // Demo client
        $client = Client::create([
            'company_name' => 'Demo Corp', 'slug' => 'demo-corp',
            'owner_user_id' => null, 'billing_email' => 'billing@demo.com',
            'plan_id' => $proPlan->id, 'status' => 'active',
        ]);

        $clientOwner = User::create([
            'name' => 'John Client', 'email' => 'john@demo.com',
            'password' => Hash::make('Client@2026!'), 'role' => 'client_owner',
            'client_id' => $client->id, 'status' => 'active', 'email_verified_at' => now(),
        ]);

        $client->update(['owner_user_id' => $clientOwner->id]);
    }
}
