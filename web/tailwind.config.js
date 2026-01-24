/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        'pkr-green': {
          950: '#0a1f14',
          900: '#0d2818',
          800: '#1a472a',
          700: '#2d5a3d',
          600: '#3d7a52',
        },
        'pkr-gold': {
          600: '#b8960f',
          500: '#d4af37',
          400: '#e4c45a',
          300: '#f5deb3',
          200: '#faf0d6',
        }
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
