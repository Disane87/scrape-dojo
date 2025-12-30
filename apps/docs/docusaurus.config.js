// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Scrape Dojo',
  tagline: 'Web Scraping Framework Documentation',
  favicon: 'img/favicon.ico',

  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',

  organizationName: 'scrape-dojo',
  projectName: 'scrape-dojo',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-org/scrape-dojo/tree/main/apps/docs/',
          // docItemComponent: '@theme/ApiItem', // Wird aktiviert wenn OpenAPI-Plugin aktiviert ist
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/your-org/scrape-dojo/tree/main/apps/docs/',
          authorsMapPath: 'authors.yml',
          onInlineAuthors: 'ignore',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themes: [
    // 'docusaurus-theme-openapi-docs', // Aktivieren Sie dies, nachdem openapi.json generiert wurde
    '@docusaurus/theme-mermaid'
  ],
  
  plugins: [
    // OpenAPI Plugin - Auskommentiert bis openapi.json erstellt wurde
    // Aktivieren Sie dies mit: pnpm generate:openapi
    // [
    //   'docusaurus-plugin-openapi-docs',
    //   {
    //     id: 'api',
    //     docsPluginId: 'classic',
    //     config: {
    //       scrapeDojo: {
    //         specPath: '../../apps/api/openapi.json',
    //         outputDir: 'docs/api',
    //         sidebarOptions: {
    //           groupPathsBy: 'tag',
    //         },
    //       },
    //     },
    //   },
    // ],
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en', 'de'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: '/docs',
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/scrape-dojo-readme-logo.png',
      navbar: {
        title: 'Scrape Dojo',
        logo: {
          alt: 'Scrape Dojo Logo',
          src: 'img/scrape-dojo-app-icon-128x128.png',
          srcDark: 'img/scrape-dojo-app-icon-128x128.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Tutorial',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://github.com/your-org/scrape-dojo',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Tutorial',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/your-org/scrape-dojo',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Scrape Dojo. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
