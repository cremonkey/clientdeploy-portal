<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('projects.{projectId}', function ($user, $projectId) {
    return $user->isSuperAdmin() || $user->projects()->where('projects.id', $projectId)->exists();
});

Broadcast::channel('projects.{projectId}.logs', function ($user, $projectId) {
    return $user->isSuperAdmin() || $user->projects()->where('projects.id', $projectId)->exists();
});
