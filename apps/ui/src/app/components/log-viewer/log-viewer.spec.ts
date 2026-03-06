import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { LogViewerComponent } from './log-viewer';
import { provideTransloco } from '@jsverse/transloco';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('LogViewerComponent', () => {
  let component: LogViewerComponent;
  let fixture: ComponentFixture<LogViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogViewerComponent],
      providers: [
        provideHttpClient(),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LogViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default log levels', () => {
    expect(component.logLevels).toContain('error');
    expect(component.logLevels).toContain('warn');
    expect(component.logLevels).toContain('log');
  });

  it('should be expanded by default', () => {
    expect(component.isExpanded()).toBe(true);
  });
});
