// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
  site: 'https://disane87.github.io',
  base: '/scrape-dojo',

  integrations: [
      mermaid({
        theme: 'default',
        autoTheme: true,
      }),
      starlight({
          title: 'Scrape Dojo',
          description: 'Web Scraping Framework Documentation',
          logo: {
              src: './public/logos/scrape-dojo-app-icon-64x64.png',
          },
          social: [
              {
                  icon: 'github',
                  label: 'GitHub',
                  href: 'https://github.com/disane87/scrape-dojo',
              },
          ],
          defaultLocale: 'de',
          locales: {
              de: {
                  label: 'Deutsch',
                  lang: 'de',
              },
              en: {
                  label: 'English',
                  lang: 'en',
              },
          },
          customCss: ['./src/styles/global.css'],
          sidebar: [
              {
                  label: '🚀 Getting Started',
                  translations: {
                      de: '🚀 Erste Schritte',
                  },
                  autogenerate: { directory: 'getting-started' },
              },
              {
                  label: '📖 User Guide',
                  translations: {
                      de: '📖 Benutzerhandbuch',
                  },
                  autogenerate: { directory: 'user-guide' },
              },
              {
                  label: '💡 Examples',
                  translations: {
                      de: '💡 Beispiele',
                  },
                  autogenerate: { directory: 'examples' },
              },
              {
                  label: '🔧 Developer Guide',
                  translations: {
                      de: '🔧 Entwicklerhandbuch',
                  },
                  autogenerate: { directory: 'developer' },
              },
          ],
      }),
	],

  vite: {
    plugins: [tailwindcss()],
  },
});
