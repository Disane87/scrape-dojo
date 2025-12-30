import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LogViewerComponent } from './log-viewer';

describe('LogViewerComponent', () => {
  let component: LogViewerComponent;
  let fixture: ComponentFixture<LogViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogViewerComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LogViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display logs', () => {
    component.logs = [
      { level: 'info', message: 'Test log 1', timestamp: new Date() },
      { level: 'error', message: 'Test log 2', timestamp: new Date() },
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test log 1');
    expect(compiled.textContent).toContain('Test log 2');
  });

  it('should filter logs by level', () => {
    component.logs = [
      { level: 'info', message: 'Info log', timestamp: new Date() },
      { level: 'error', message: 'Error log', timestamp: new Date() },
      { level: 'warn', message: 'Warning log', timestamp: new Date() },
    ];

    component.filterByLevel('error');
    const filtered = component.getFilteredLogs();

    expect(filtered.length).toBe(1);
    expect(filtered[0].level).toBe('error');
  });

  it('should clear logs', () => {
    component.logs = [
      { level: 'info', message: 'Test', timestamp: new Date() },
    ];

    component.clearLogs();

    expect(component.logs.length).toBe(0);
  });
});
