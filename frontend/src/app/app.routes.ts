import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth.guard';
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'accounts',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./accounts/accounts.component').then((m) => m.AccountsComponent),
  },
  {
    path: 'accounts/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./accounts/account-detail.component').then(
        (m) => m.AccountDetailComponent,
      ),
  },
  {
    path: 'transfers',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./transfers/transfers.component').then(
        (m) => m.TransfersComponent,
      ),
  },
  {
    path: 'deposits',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./movements/movements.component').then(
        (m) => m.MovementsComponent,
      ),
    data: { kind: 'deposits' },
  },
  {
    path: 'deposits/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./movements/movement-detail.component').then(
        (m) => m.MovementDetailComponent,
      ),
    data: { kind: 'deposits' },
  },
  {
    path: 'withdrawals',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./movements/movements.component').then(
        (m) => m.MovementsComponent,
      ),
    data: { kind: 'withdrawals' },
  },
  {
    path: 'withdrawals/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./movements/movement-detail.component').then(
        (m) => m.MovementDetailComponent,
      ),
    data: { kind: 'withdrawals' },
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'admin/requests',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/account-requests.component').then(
        (m) => m.AccountRequestsComponent,
      ),
  },
  {
    path: 'admin/users/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/user-detail.component').then(
        (m) => m.UserDetailComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
