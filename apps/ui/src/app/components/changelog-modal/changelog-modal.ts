import {
  Component,
  inject,
  computed,
  signal,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalComponent } from '../shared';
import { HealthService } from '../../services/health.service';
import { TranslocoModule } from '@jsverse/transloco';
import { marked } from 'marked';
import 'iconify-icon';

@Component({
  selector: 'app-changelog-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './changelog-modal.html',
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .changelog-content h1 {
        display: none;
      }
      .changelog-content h2 {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dojo-text);
        border-bottom: 1px solid var(--dojo-border);
        padding-bottom: 0.5rem;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
      }
      .changelog-content h2:first-child {
        margin-top: 0;
      }
      .changelog-content h2 a {
        color: var(--dojo-accent);
        text-decoration: none;
      }
      .changelog-content h2 a:hover {
        text-decoration: underline;
      }
      .changelog-content h3 {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dojo-text-muted);
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }
      .changelog-content ul {
        list-style: disc;
        padding-left: 1.25rem;
        margin: 0.25rem 0;
      }
      .changelog-content li {
        font-size: 0.875rem;
        color: var(--dojo-text);
        padding: 0.125rem 0;
      }
      .changelog-content a {
        color: var(--dojo-accent);
        text-decoration: none;
      }
      .changelog-content a:hover {
        text-decoration: underline;
      }
      .changelog-content p {
        font-size: 0.875rem;
        color: var(--dojo-text-muted);
        margin: 0.5rem 0;
      }
      .changelog-content code {
        font-size: 0.75rem;
        background: var(--dojo-surface-2);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-family: var(--font-mono, monospace);
      }
    `,
  ],
})
export class ChangelogModalComponent implements OnInit {
  private healthService = inject(HealthService);
  private router = inject(Router);

  isOpen = signal(true);

  ngOnInit(): void {
    this.healthService.loadChangelog();
  }

  close(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  changelogHtml = computed<string>(() => {
    const raw = this.healthService.changelog();
    if (!raw) return '';
    return marked.parse(raw) as string;
  });
}
