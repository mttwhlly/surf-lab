import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'emoji': ['Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', 'Arial', 'sans-serif']
      },
      colors: {
        'surf-blue': '#0077cc',
        'surf-blue-dark': '#003366'
      },
      backdropBlur: {
        '20': '20px'
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'bell-ring': 'bell-ring 0.5s ease-in-out',
        'slide-in': 'slide-in 0.3s ease',
        'wind-flow': 'wind-flow 3s linear infinite',
        'period-wave': 'period-wave 4s ease-in-out infinite'
      },
      keyframes: {
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' }
        },
        'bell-ring': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'rotate(-3deg)' },
          '20%, 40%, 60%, 80%': { transform: 'rotate(3deg)' }
        },
        'slide-in': {
          'from': {
            opacity: '0',
            transform: 'translateX(-50%) translateY(-20px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateX(-50%) translateY(0)'
          }
        },
        'wind-flow': {
          '0%': { transform: 'translateX(-100px) translateY(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateX(300px) translateY(0)', opacity: '0' }
        },
        'period-wave': {
          '0%, 100%': { transform: 'translateY(0) scaleX(1)', opacity: '0.3' },
          '50%': { transform: 'translateY(-10px) scaleX(1.2)', opacity: '0.8' }
        }
      }
    },
  },
  plugins: [],
}

export default config