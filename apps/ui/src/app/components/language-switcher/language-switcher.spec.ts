import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcherComponent } from './language-switcher';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let translocoService: any; // TranslocoService

  const mockTranslocoService = {
    selectTranslate: vi.fn(),
    setActiveLang: vi.fn(),
    getActiveLang: vi.fn().mockReturnValue('en'),
    getAvailableLangs: vi.fn().mockReturnValue(['en', 'de', 'fr']),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [
        { provide: TranslocoService, useValue: mockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    translocoService = TestBed.inject(TranslocoService) as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display available languages', () => {
    expect(translocoService.getAvailableLangs).toHaveBeenCalled();
  });

  it('should change language when selected', () => {
    component.changeLanguage('de');
    expect(translocoService.setActiveLang).toHaveBeenCalledWith('de');
  });
});
