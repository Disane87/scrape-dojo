import { Route } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { VariablesManagerComponent } from './variables-manager/variables-manager.component';
import { authGuard, guestGuard, setupGuard, LoginComponent, RegisterComponent, SetupComponent, OidcCallbackComponent, MfaComponent } from './auth';

export const appRoutes: Route[] = [
  // Auth Routes (public)
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [guestGuard]
  },
  { 
    path: 'setup', 
    component: SetupComponent,
    canActivate: [setupGuard]
  },
  {
    path: 'mfa',
    component: MfaComponent,
    canActivate: [guestGuard]
  },
  {
    // NOTE: Must not start with '/api' because the dev proxy forwards '/api' to the API.
    path: 'oidc/callback',
    component: OidcCallbackComponent,
    // Public route - no guard needed
  },
  
  // Protected Routes
  { 
    path: '', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'variables', 
    component: VariablesManagerComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId/:tab', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId/runs/:runId', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'jobs/:jobId/:tab/runs/:runId', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  
  // Fallback
  { path: '**', redirectTo: '' }
];
