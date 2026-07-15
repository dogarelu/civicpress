import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth.store';

export const editorGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const user = await auth.hydrate();
  if (!user) {
    return router.parseUrl('/login');
  }
  if (user.role !== 'EDITOR' && user.role !== 'ADMIN') {
    return router.parseUrl('/dashboard');
  }
  return true;
};
