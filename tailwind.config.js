import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0eeff',
          100: '#e0dcff',
          200: '#c4bcff',
          300: '#a090ff',
          400: '#7c5fff',
          500: '#6040ee',
          600: '#4d2fd4',
          700: '#3d22b0',
          800: '#2e1a8a',
          900: '#1e1060',
          950: '#0f0830',
        },
        surface: {
          950: '#060608',
          900: '#0c0c12',
          800: '#12121e',
          700: '#1a1a2e',
          600: '#22223c',
          500: '#2e2e50',
        },
        data: {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
          blue: '#38bdf8',
          orange: '#f97316',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'cursor-ping': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'stagger-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'cursor-ping': 'cursor-ping 1.1s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        'slide-up-fade': 'slide-up-fade 200ms ease-out',
        'stagger-in': 'stagger-in 220ms ease-out both',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
