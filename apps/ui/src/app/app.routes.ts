import { Route } from '@angular/router';
import { authGuard, guestGuard, setupGuard } from './auth';

const loadLogin = () => import('./auth/pages/login/login.component').then((m) => m.LoginComponent);
const loadRegister = () => import('./auth/pages/register/register.component').then((m) => m.RegisterComponent);
const loadSetup = () => import('./auth/pages/setup/setup.component').then((m) => m.SetupComponent);
const loadMfa = () => import('./auth/pages/mfa/mfa.component').then((m) => m.MfaComponent);
const loadOidcCallback = () => import('./auth/pages/oidc-callback/oidc-callback.component').then((m) => m.OidcCallbackComponent);

const loadDashboard = () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent);
const loadVariablesManager = () => import('./variables-manager/variables-manager.component').then((m) => m.VariablesManagerComponent);

export const appRoutes: Route[] = [
  // Auth Routes (public)
  { 
    path: 'login', 
    loadComponent: loadLogin,
    canActivate: [guestGuard]
  },
  { 
    path: 'register', 
    loadComponent: loadRegister,
    canActivate: [guestGuard]
  },
  { 
    path: 'setup', 
    loadComponent: loadSetup,
    canActivate: [setupGuard]
  },
  {
    path: 'mfa',
    loadComponent: loadMfa,
    canActivate: [guestGuard]
  },
  {
    // NOTE: Must not start with '/api' because the dev proxy forwards '/api' to the API.
    path: 'oidc/callback',
    loadComponent: loadOidcCallback,
    // Public route - no guard needed
  },
  
  // Protected Routes
  { 
    path: '', 
    loadComponent: loadDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'variables', 
    loadComponent: loadVariablesManager,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId', 
    loadComponent: loadDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId/:tab', 
    loadComponent: loadDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId/runs/:runId', 
    loadComponent: loadDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId/:tab/runs/:runId', 
    loadComponent: loadDashboard,
    canActivate: [authGuard]
  },

  // Settings Routes
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.routes').then(m => m.settingsRoutes),
    canActivate: [authGuard]
  },
  
  // Fallback
  { path: '**', redirectTo: '' }
];
