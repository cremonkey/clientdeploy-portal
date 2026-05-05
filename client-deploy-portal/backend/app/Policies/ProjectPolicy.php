<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        return $user->canAccessProject($project);
    }

    public function deploy(User $user, Project $project): bool
    {
        return $user->canDeployProject($project) && $project->canDeploy();
    }

    public function restart(User $user, Project $project): bool
    {
        return $user->canRestartProject($project);
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->canDeleteProject($project);
    }

    public function editEnvironment(User $user, Project $project): bool
    {
        return $user->canEditEnv($project);
    }

    public function manageDomains(User $user, Project $project): bool
    {
        return $user->canManageDomains($project);
    }

    public function requestDomainChange(User $user, Project $project): bool
    {
        return $user->canRequestDomainChange($project);
    }

    public function viewLogs(User $user, Project $project): bool
    {
        return $user->canAccessProject($project);
    }
}
