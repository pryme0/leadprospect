import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Legacy brand tokens (admin workspace depends on these) ── */
        brand: {
          dark: '#073B3A',
          darker: '#112126',
          navy: '#17373A',
          slate: '#275256',
          accent: '#00CEC8',
          'accent-dim': '#009B98',
          cyan: '#FCEFC3',
          'cyan-dim': '#009B98',
          blue: '#006B67',
          warning: '#EB4203',
          danger: '#ff4757',
          muted: '#7b8f99',
          light: '#E4FFFB',
        },
        /* ── ProspectGrid marketing design tokens ── */
        pg: {
          navy:       '#0B132B',
          blue:       '#2563EB',
          'blue-dark':'#1D4ED8',
          cyan:       '#38BDF8',
          success:    '#22C55E',
          'gray-50':  '#F8FAFC',
          'gray-100': '#F1F5F9',
          'gray-200': '#E2E8F0',
          'gray-300': '#CBD5E1',
          'gray-400': '#94A3B8',
          'gray-500': '#64748B',
          'gray-700': '#334155',
          'gray-900': '#0F172A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'pg-card': '0 4px 20px rgba(15,23,42,0.08)',
        'pg-card-hover': '0 20px 60px rgba(15,23,42,0.12)',
        'pg-cta': '0 20px 60px rgba(37,99,235,0.28)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 206, 200, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 206, 200, 0.6)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
