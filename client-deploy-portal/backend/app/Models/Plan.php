<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'monthly_price', 'yearly_price', 'storage_limit_mb', 'project_limit', 'deployment_limit_per_day', 'support_level', 'is_active', 'sort_order'];
    protected $casts = ['monthly_price' => 'integer', 'yearly_price' => 'integer', 'is_active' => 'boolean'];

    public function clients() { return $this->hasMany(Client::class); }
    public function scopeActive($q) { return $q->where('is_active', true); }
    public function getFormattedMonthlyPriceAttribute(): string { return '$' . number_format($this->monthly_price / 100, 2); }
}
