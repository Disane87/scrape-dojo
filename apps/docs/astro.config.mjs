// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';
import { readFileSync } from 'node:fs';

const isProd = process.env.NODE_ENV === 'production';
const rootPkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
const version = rootPkg.version;

// https://astro.build/config
export default defineConfig({
  site: 'https://scrape-dojo.com',

  integrations: [
      mermaid({
        theme: 'default',
        autoTheme: true,
      }),
      starlight({
          title: `Scrape Dojo v${version}`,
          description: 'Web Scraping Framework Documentation',
          logo: {
              src: './public/scrape-dojo-app-icon-64x64.png',
          },
          favicon: '/scrape-dojo-app-icon-64x64.png',
          social: [
              {
                  icon: 'github',
                  label: 'GitHub',
                  href: 'https://github.com/disane87/scrape-dojo',
              },
              {
                  icon: 'heart',
                  label: 'Sponsor',
                  href: 'https://github.com/sponsors/Disane87',
              },
          ],
          editLink: {
              baseUrl: 'https://github.com/disane87/scrape-dojo/edit/main/apps/docs/',
          },
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
          head: [
              {
                  tag: 'script',
                  content: `document.addEventListener('DOMContentLoaded',()=>{const a=document.querySelector('.site-title');if(a)a.href='/';});`,
              },
              ...(isProd ? [{
                  tag: 'script',
                  attrs: {
                      defer: true,
                      src: 'https://statistics.disane.dev/script.js',
                      'data-website-id': '59270b8d-22f0-4136-b596-ec0bf7d86e99',
                  },
              }] : []),
          ],
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
