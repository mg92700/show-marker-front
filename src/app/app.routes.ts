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
        path: 'friends',
        title: 'Amis · Show Marker',
        loadComponent: () => import('./pages/social/social.page').then((m) => m.SocialPage),
      },
      {
        path: 'users/:id',
        title: 'Profil · Show Marker',
        loadComponent: () =>
          import('./pages/user-profile/user-profile.page').then((m) => m.UserProfilePage),
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
