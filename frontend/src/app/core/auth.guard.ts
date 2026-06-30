import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() || inject(Router).createUrlTree(['/login']);
export const adminGuard: CanActivateFn = () =>
  inject(AuthService).isAdmin() || inject(Router).createUrlTree(['/']);
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).loggedIn() || inject(Router).createUrlTree(['/']);
