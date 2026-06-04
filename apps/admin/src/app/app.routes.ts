import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'posts',
        loadComponent: () =>
          import('./pages/posts/posts-list.component').then((m) => m.PostsListComponent),
      },
      {
        path: 'posts/new',
        loadComponent: () =>
          import('./pages/posts/post-edit.component').then((m) => m.PostEditComponent),
      },
      {
        path: 'posts/:id/edit',
        loadComponent: () =>
          import('./pages/posts/post-edit.component').then((m) => m.PostEditComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories/categories-list.component').then(
            (m) => m.CategoriesListComponent,
          ),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/audit.component').then((m) => m.AuditComponent),
      },
      {
        path: 'homepage',
        loadComponent: () =>
          import('./pages/homepage/homepage.component').then((m) => m.HomepageComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
