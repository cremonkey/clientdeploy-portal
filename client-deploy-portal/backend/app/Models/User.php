<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'client_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Check if user can access a project.
     */
    public function canAccessProject($project): bool
    {
        if (in_array($this->role, [
            'super_admin',
            'agency_admin',
            'developer',
        ])) {
            return true;
        }

        return $this->client_id === $project->client_id;
    }

public function canDeployProject($project): bool
{
    return $this->canAccessProject($project);
}
public function isClient(): bool
{
    return $this->role === 'client';
}

public function isSuperAdmin(): bool
{
    return $this->role === 'super_admin';
}

public function isAgencyAdmin(): bool
{
    return $this->role === 'agency_admin';
}

public function isDeveloper(): bool
{
    return $this->role === 'developer';
}

}
