import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#F7F4EE',
        primary: '#2F2A24',
        secondary: '#6D655B',
        border: '#D9D2C6',
        accent: '#7A6E5F',
        accentHover: '#6C6155',
        accentSoft: '#EFE8DC',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;
