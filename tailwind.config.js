/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090C',
          900: '#0B0D10',
          850: '#0E1116',
          800: '#12161C',
          750: '#161B22',
          700: '#1B2129',
          600: '#222932',
          500: '#2B333E',
          400: '#3A434F',
          300: '#525C6A',
          200: '#7A8694',
          100: '#A6AEBA',
        },
        brand: {
          DEFAULT: '#2BE5A0',
          50: '#E6FFF6',
          100: '#B8F8DE',
          200: '#7DEFBE',
          300: '#4AE3A8',
          400: '#2BE5A0',
          500: '#16C98A',
          600: '#0FA972',
          700: '#0B8559',
          800: '#0A6645',
          900: '#084D36',
        },
        loss: {
          DEFAULT: '#FF5A5F',
          600: '#E8434A',
          700: '#C4353B',
        },
        gold: {
          DEFAULT: '#E8B455',
          400: '#F0C574',
          600: '#C9962F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Clash Display"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.4), 0 4px 24px -8px rgba(0,0,0,0.5)',
        'glow': '0 0 0 1px rgba(43,229,160,0.18), 0 8px 40px -12px rgba(43,229,160,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'draw': {
          '0%': { strokeDashoffset: 'var(--len, 1000)' },
          '100%': { strokeDashoffset: '0' },
        },
        'grow-y': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'draw': 'draw 1.2s cubic-bezier(0.22,1,0.36,1) forwards',
        'grow-y': 'grow-y 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
