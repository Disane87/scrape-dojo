import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/first-scrape',
        'getting-started/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Benutzerhandbuch',
      collapsed: false,
      items: [
        'user-guide/scrape-configuration',
        'user-guide/data-flow',
        'user-guide/actions-overview',
        'user-guide/loops',
        'user-guide/templating',
        'user-guide/transformations',
        'user-guide/secrets-variables',
      ],
    },
    {
      type: 'category',
      label: 'Erweitert',
      items: [
        'advanced/authentication',
        'advanced/environment-variables',
        'advanced/database',
      ],
    },
    {
      type: 'category',
      label: 'Entwickler',
      items: [
        'developer/contributing',
        'developer/project-structure',
        'developer/api-reference',
        'developer/testing',
        'developer/creating-actions',
      ],
    },
    {
      type: 'category',
      label: 'Beispiele',
      items: [
        'examples/simple-scrape',
        'examples/loop-example',
        'examples/pdf-download',
        'examples/login-flow',
      ],
    },
    'troubleshooting',
  ],
};

export default sidebars;
