/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af',
          800: '#1e3a8a', 900: '#0f172a', 950: '#020617',
        },
        surface: {
          0: '#ffffff', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
          700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        success: { DEFAULT: '#16a34a', light: '#22c55e', dark: '#15803d' },
        warning: { DEFAULT: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
        danger: { DEFAULT: '#dc2626', light: '#ef4444', dark: '#b91c1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'glow': '0 0 20px rgb(37 99 235 / 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
