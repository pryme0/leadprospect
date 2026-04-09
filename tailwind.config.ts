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
        brand: {
          dark: '#080e1c',
          darker: '#050a14',
          navy: '#0b1828',
          slate: '#172235',
          // Primary brand blue — matches EMC logo electric blue
          accent: '#0BAAEF',
          'accent-dim': '#0888CC',
          // Lighter sky blue for gradients / secondary highlights
          cyan: '#40C4FF',
          'cyan-dim': '#1EA8E0',
          blue: '#1e90ff',
          warning: '#ff6b35',
          danger: '#ff4757',
          muted: '#8892b0',
          light: '#ccd6f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(11, 170, 239, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(11, 170, 239, 0.6)' },
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
