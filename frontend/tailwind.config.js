/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050810',
          900: '#0A0E1A',
          800: '#0F1628',
          700: '#131929',
          600: '#1A2235',
          500: '#1E2A40',
          400: '#243047',
        },
        panel: '#1A2235',
        border: '#243047',
        'confidence-very-high': '#10b981',
        'confidence-high': '#34d399',
        'confidence-moderate': '#fbbf24',
        'confidence-low': '#f97316',
        'confidence-very-low': '#ef4444',
        'risk-high': '#ef4444',
        'risk-medium': '#f97316',
        'risk-low': '#10b981',
        'accent-cyan': '#22d3ee',
        'accent-blue': '#60a5fa',
        'accent-amber': '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
