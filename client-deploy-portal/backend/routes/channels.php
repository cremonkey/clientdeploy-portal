<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('projects.{projectId}', function ($user, $projectId) {
    // Check if user has access to the project
    return $user->projects()->where('projects.id', $projectId)->exists() || $user->is_super_admin;
});

Broadcast::channel('projects.{projectId}.logs', function ($user, $projectId) {
    // Check if user has access to the project logs
    return $user->projects()->where('projects.id', $projectId)->exists() || $user->is_super_admin;
});
