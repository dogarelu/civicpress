import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth.store';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const user = await auth.hydrate();
  if (!user) {
    return router.parseUrl('/login');
  }
  if (user.role !== 'ADMIN') {
    return router.parseUrl('/dashboard');
  }
  return true;
};
