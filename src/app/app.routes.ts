import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Connexion · Show Marker',
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Inscription · Show Marker',
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    title: 'Mot de passe oublié · Show Marker',
    loadComponent: () => import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  // Pages ouvertes depuis un lien d'e-mail : accessibles connecté ou non.
  {
    path: 'reset-password',
    title: 'Nouveau mot de passe · Show Marker',
    loadComponent: () => import('./pages/auth/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'verify-email',
    title: 'Confirmation de l’e-mail · Show Marker',
    loadComponent: () => import('./pages/auth/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Accueil · Show Marker',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'library',
        title: 'Bibliothèque · Show Marker',
        loadComponent: () => import('./pages/library/library.page').then((m) => m.LibraryPage),
      },
      {
        path: 'search',
        title: 'Recherche · Show Marker',
        loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: 'shows/:id',
        title: 'Série · Show Marker',
        loadComponent: () =>
          import('./pages/show-detail/show-detail.page').then((m) => m.ShowDetailPage),
      },
      {
        path: 'movies/:id',
        title: 'Film · Show Marker',
        loadComponent: () =>
          import('./pages/movie-detail/movie-detail.page').then((m) => m.MovieDetailPage),
      },
      {
        path: 'profile',
        title: 'Profil · Show Marker',
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
