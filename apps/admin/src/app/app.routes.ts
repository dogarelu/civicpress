import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { editorGuard } from './guards/editor.guard';
import { editorialGuard } from './guards/editorial.guard';
import { chiefEditorGuard } from './guards/chief-editor.guard';

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
        path: 'analytics',
        canActivate: [chiefEditorGuard],
        loadComponent: () =>
          import('./pages/analytics.component').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'posts',
        loadComponent: () =>
          import('./pages/posts/posts-list.component').then((m) => m.PostsListComponent),
      },
      {
        path: 'trash',
        loadComponent: () => import('./pages/posts/trash.component').then((m) => m.TrashComponent),
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
        canActivate: [editorGuard],
        loadComponent: () =>
          import('./pages/categories/categories-list.component').then(
            (m) => m.CategoriesListComponent,
          ),
      },
      {
        path: 'pills',
        canActivate: [editorialGuard],
        loadComponent: () =>
          import('./pages/pills/pills-list.component').then((m) => m.PillsListComponent),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/audit.component').then((m) => m.AuditComponent),
      },
      {
        path: 'settings',
        canActivate: [editorGuard],
        loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications-settings.component').then(
            (m) => m.NotificationsSettingsComponent,
          ),
      },
      {
        path: 'layouts',
        canActivate: [editorGuard],
        loadComponent: () =>
          import('./pages/layouts/layouts.component').then((m) => m.LayoutsComponent),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/users/users-list.component').then((m) => m.UsersListComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
