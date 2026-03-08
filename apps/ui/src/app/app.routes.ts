import { Route } from '@angular/router';
import { authGuard, guestGuard, setupGuard } from './auth';

const loadLogin = () =>
  import('./auth/pages/login/login.component').then((m) => m.LoginComponent);
const loadRegister = () =>
  import('./auth/pages/register/register.component').then(
    (m) => m.RegisterComponent,
  );
const loadSetup = () =>
  import('./auth/pages/setup/setup.component').then((m) => m.SetupComponent);
const loadMfa = () =>
  import('./auth/pages/mfa/mfa.component').then((m) => m.MfaComponent);
const loadOidcCallback = () =>
  import('./auth/pages/oidc-callback/oidc-callback.component').then(
    (m) => m.OidcCallbackComponent,
  );

const loadDashboard = () =>
  import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent);
const loadVariablesManager = () =>
  import('./variables-manager/variables-manager.component').then(
    (m) => m.VariablesManagerComponent,
  );
const loadSecretsManager = () =>
  import('./components/secrets-manager/secrets-manager').then(
    (m) => m.SecretsManagerComponent,
  );

// Modal components for auxiliary routes
const loadRunDialog = () =>
  import('./components/run-dialog/run-dialog').then(
    (m) => m.RunDialogComponent,
  );
const loadApiDocsModal = () =>
  import('./components/api-docs-modal/api-docs-modal').then(
    (m) => m.ApiDocsModalComponent,
  );
const loadSettingsModal = () =>
  import('./components/settings-modal/settings-modal').then(
    (m) => m.SettingsModalComponent,
  );
const loadOtpModal = () =>
  import('./components/otp-modal/otp-modal').then((m) => m.OtpModalComponent);
const loadScheduleModal = () =>
  import('./components/schedule-modal/schedule-modal').then(
    (m) => m.ScheduleModalComponent,
  );
const loadNotificationModal = () =>
  import('./components/notification-modal/notification-modal').then(
    (m) => m.NotificationModalComponent,
  );
const loadStatusModal = () =>
  import('./components/status-modal/status-modal').then(
    (m) => m.StatusModalComponent,
  );
const loadWorkflowEditorModal = () =>
  import('./components/workflow-editor-modal/workflow-editor-modal').then(
    (m) => m.WorkflowEditorModalComponent,
  );

export const appRoutes: Route[] = [
  // Auth Routes (public)
  {
    path: 'login',
    loadComponent: loadLogin,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: loadRegister,
    canActivate: [guestGuard],
  },
  {
    path: 'setup',
    loadComponent: loadSetup,
    canActivate: [setupGuard],
  },
  {
    path: 'mfa',
    loadComponent: loadMfa,
    canActivate: [guestGuard],
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
    canActivate: [authGuard],
  },
  {
    path: 'variables',
    loadComponent: loadVariablesManager,
    canActivate: [authGuard],
  },
  {
    path: 'jobs/:jobId',
    loadComponent: loadDashboard,
    canActivate: [authGuard],
  },
  {
    path: 'jobs/:jobId/:tab',
    loadComponent: loadDashboard,
    canActivate: [authGuard],
  },
  {
    path: 'jobs/:jobId/runs/:runId',
    loadComponent: loadDashboard,
    canActivate: [authGuard],
  },
  {
    path: 'jobs/:jobId/:tab/runs/:runId',
    loadComponent: loadDashboard,
    canActivate: [authGuard],
  },

  // Settings Routes
  {
    path: 'settings',
    loadChildren: () =>
      import('./settings/settings.routes').then((m) => m.settingsRoutes),
    canActivate: [authGuard],
  },

  // Modal Routes (Auxiliary/Named Outlet)
  {
    path: 'variables-modal',
    outlet: 'modal',
    loadComponent: loadVariablesManager,
    canActivate: [authGuard],
  },
  {
    path: 'secrets',
    outlet: 'modal',
    loadComponent: loadSecretsManager,
    canActivate: [authGuard],
  },
  {
    path: 'secrets/create',
    outlet: 'modal',
    loadComponent: loadSecretsManager,
    canActivate: [authGuard],
  },
  {
    path: 'secrets/create/:secretName',
    outlet: 'modal',
    loadComponent: loadSecretsManager,
    canActivate: [authGuard],
  },
  {
    path: 'run/:workflowId',
    outlet: 'modal',
    loadComponent: loadRunDialog,
    canActivate: [authGuard],
  },
  {
    path: 'api-docs',
    outlet: 'modal',
    loadComponent: loadApiDocsModal,
    canActivate: [authGuard],
  },
  {
    path: 'settings-modal',
    outlet: 'modal',
    loadComponent: loadSettingsModal,
    canActivate: [authGuard],
  },
  {
    path: 'otp',
    outlet: 'modal',
    loadComponent: loadOtpModal,
    canActivate: [authGuard],
  },
  {
    path: 'schedule/:scrapeId',
    outlet: 'modal',
    loadComponent: loadScheduleModal,
    canActivate: [authGuard],
  },
  {
    path: 'notifications',
    outlet: 'modal',
    loadComponent: loadNotificationModal,
    canActivate: [authGuard],
  },
  {
    path: 'status',
    outlet: 'modal',
    loadComponent: loadStatusModal,
    canActivate: [authGuard],
  },
  {
    path: 'workflow-editor',
    outlet: 'modal',
    loadComponent: loadWorkflowEditorModal,
    canActivate: [authGuard],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
