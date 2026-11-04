import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isEditorialRole } from '@civicpress/shared';
import { AuthStore } from '../services/auth.store';

export const editorialGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const user = await auth.hydrate();
  if (!user) {
    return router.parseUrl('/login');
  }
  if (!isEditorialRole(user.role)) {
    return router.parseUrl('/dashboard');
  }
  return true;
};
