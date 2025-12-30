import { Component, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../auth/services/auth.service';
import 'iconify-icon';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslocoModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        <div class="min-h-screen bg-dojo-bg">
            <!-- Header -->
            <div class="bg-dojo-surface border-b border-dojo-border">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <a routerLink="/" class="text-dojo-text-muted hover:text-dojo-text transition-colors">
                                <iconify-icon icon="mdi:arrow-left" class="text-2xl"></iconify-icon>
                            </a>
                            <div>
                                <h1 class="text-2xl font-bold text-dojo-text">
                                    {{ 'settings.title' | transloco }}
                                </h1>
                                <p class="text-sm text-dojo-text-muted mt-1">
                                    {{ 'settings.subtitle' | transloco }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <!-- Sidebar Navigation -->
                    <div class="lg:col-span-1">
                        <nav class="space-y-1">
                            <a
                                routerLink="/settings/profile"
                                routerLinkActive="bg-orange-500/10 text-orange-500 border-orange-500"
                                class="flex items-center gap-3 px-4 py-3 text-dojo-text hover:bg-dojo-surface rounded-lg border border-transparent transition-all"
                            >
                                <iconify-icon icon="mdi:account" class="text-xl"></iconify-icon>
                                <span>{{ 'settings.profile.title' | transloco }}</span>
                            </a>
                            
                            <a
                                routerLink="/settings/security"
                                routerLinkActive="bg-orange-500/10 text-orange-500 border-orange-500"
                                class="flex items-center gap-3 px-4 py-3 text-dojo-text hover:bg-dojo-surface rounded-lg border border-transparent transition-all"
                            >
                                <iconify-icon icon="mdi:shield-lock" class="text-xl"></iconify-icon>
                                <span>{{ 'settings.security.title' | transloco }}</span>
                            </a>
                            
                            <a
                                routerLink="/settings/devices"
                                routerLinkActive="bg-orange-500/10 text-orange-500 border-orange-500"
                                class="flex items-center gap-3 px-4 py-3 text-dojo-text hover:bg-dojo-surface rounded-lg border border-transparent transition-all"
                            >
                                <iconify-icon icon="mdi:devices" class="text-xl"></iconify-icon>
                                <span>{{ 'settings.devices.title' | transloco }}</span>
                            </a>
                        </nav>
                    </div>

                    <!-- Main Content Area -->
                    <div class="lg:col-span-3">
                        <router-outlet></router-outlet>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class SettingsComponent {}
