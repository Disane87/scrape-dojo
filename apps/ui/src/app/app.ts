import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiOfflineOverlayComponent } from './components/api-offline-overlay/api-offline-overlay.component';

@Component({
  imports: [RouterModule, ApiOfflineOverlayComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'Scrape Dojo';

  ngOnInit(): void {
    this.setThemeColor();
  }

  private setThemeColor(): void {
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-dojo-bg')
      .trim();

    if (bgColor) {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', bgColor);
      }
    }
  }
}
