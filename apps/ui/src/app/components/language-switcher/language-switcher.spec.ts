import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PLATFORM_ID, NO_ERRORS_SCHEMA } from '@angular/core';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { provideTransloco } from '@jsverse/transloco';
import { provideHttpClient } from '@angular/common/http';

describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [
        provideHttpClient(),
        provideTransloco({
          config: {
            availableLangs: ['en', 'de'],
            defaultLang: 'en',
          },
        }),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select a language', () => {
    (component as any).selectLanguage('de');
    expect((component as any).currentLanguage).toBe('de');
  });
});
