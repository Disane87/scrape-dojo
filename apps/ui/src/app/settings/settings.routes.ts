import { Routes } from '@angular/router';
import { authGuard } from '../auth/guards/auth.guard';
import { SettingsComponent } from './settings.component';
import { ProfileSettingsComponent } from './pages/profile-settings.component';
import { SecuritySettingsComponent } from './pages/security-settings.component';
import { DeviceSettingsComponent } from './pages/device-settings.component';

const loadSecretsManager = () => import('../components/secrets-manager/secrets-manager').then(m => m.SecretsManagerComponent);

export const settingsRoutes: Routes = [
    {
        path: '',
        component: SettingsComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'profile',
                pathMatch: 'full',
            },
            {
                path: 'profile',
                component: ProfileSettingsComponent,
            },
            {
                path: 'security',
                component: SecuritySettingsComponent,
            },
            {
                path: 'devices',
                component: DeviceSettingsComponent,
            },
            {
                path: 'secrets',
                loadComponent: loadSecretsManager,
            },
        ],
    },
];
