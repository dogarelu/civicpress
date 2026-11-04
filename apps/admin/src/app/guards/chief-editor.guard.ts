import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canViewAnalytics } from '@civicpress/shared';
import { AuthStore } from '../services/auth.store';

export const chiefEditorGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const user = await auth.hydrate();
  if (!user) {
    return router.parseUrl('/login');
  }
  if (!canViewAnalytics(user.role)) {
    return router.parseUrl('/dashboard');
  }
  return true;
};
