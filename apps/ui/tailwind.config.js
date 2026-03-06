// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { join } = require('path');

/**
 * Scrape Dojo Tailwind Theme
 * - Uses CSS variables for easy theming (light/dark)
 * - Adds semantic tokens (bg/surface/text/brand) + optional chart colors
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: ['class'],
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        dojo: {
          // Brand tokens (semantic)
          bg: 'hsl(var(--dojo-bg) / <alpha-value>)',
          surface: 'hsl(var(--dojo-surface) / <alpha-value>)',
          'surface-2': 'hsl(var(--dojo-surface-2) / <alpha-value>)',
          'surface-3': 'hsl(var(--dojo-surface-3) / <alpha-value>)',
          border: 'hsl(var(--dojo-border) / <alpha-value>)',
          'border-muted': 'hsl(var(--dojo-border-muted) / <alpha-value>)',

          text: 'hsl(var(--dojo-text) / <alpha-value>)',
          'text-muted': 'hsl(var(--dojo-text-muted) / <alpha-value>)',
          'text-subtle': 'hsl(var(--dojo-text-subtle) / <alpha-value>)',

          // Brand colors
          red: 'hsl(var(--dojo-red) / <alpha-value>)',
          'red-strong': 'hsl(var(--dojo-red-strong) / <alpha-value>)',
          orange: 'hsl(var(--dojo-orange) / <alpha-value>)',
          gold: 'hsl(var(--dojo-gold) / <alpha-value>)',

          // Accent/Link colors
          accent: 'hsl(var(--dojo-accent) / <alpha-value>)',
          'accent-muted': 'hsl(var(--dojo-accent-muted) / <alpha-value>)',

          // Utility states
          success: 'hsl(var(--dojo-success) / <alpha-value>)',
          'success-strong': 'hsl(var(--dojo-success-strong) / <alpha-value>)',
          warning: 'hsl(var(--dojo-warning) / <alpha-value>)',
          'warning-strong': 'hsl(var(--dojo-warning-strong) / <alpha-value>)',
          danger: 'hsl(var(--dojo-danger) / <alpha-value>)',
          'danger-strong': 'hsl(var(--dojo-danger-strong) / <alpha-value>)',
          info: 'hsl(var(--dojo-info) / <alpha-value>)',
        },
      },

      fontFamily: {
        /**
         * Tip: Install Inter + JetBrains Mono via @fontsource or system fonts.
         */
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      borderRadius: {
        dojo: '0.75rem',
        'dojo-lg': '1rem',
      },

      boxShadow: {
        dojo: '0 0 0 1px hsl(var(--dojo-red) / 0.25)',
        'dojo-glow': '0 0 24px hsl(var(--dojo-red) / 0.35)',
        'dojo-soft': '0 10px 30px -12px rgba(0,0,0,0.55)',
      },

      backgroundImage: {
        /**
         * Subtle brand gradient for hero/header areas.
         */
        'dojo-sunset':
          'radial-gradient(1200px circle at 20% 10%, hsl(var(--dojo-orange) / 0.35), transparent 55%), radial-gradient(900px circle at 80% 20%, hsl(var(--dojo-red) / 0.28), transparent 60%)',
      },

      ringColor: {
        dojo: 'hsl(var(--dojo-red) / 0.55)',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -30px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-30px, 30px) scale(0.95)' },
          '66%': { transform: 'translate(20px, -20px) scale(1.05)' },
        },
        pulse: {
          '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
          '50%': { opacity: '0.25', transform: 'scale(1.1)' },
        },
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        shake: 'shake 0.3s ease-in-out',
        float: 'float 20s ease-in-out infinite',
        'float-reverse': 'floatReverse 25s ease-in-out infinite',
        'pulse-slow': 'pulse 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
