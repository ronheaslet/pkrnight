/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Legacy PKR Night colors (primary names)
        'felt': '#1a472a',
        'felt-dark': '#0d2818',
        'felt-light': '#2d5a3d',
        'gold': '#d4af37',
        'gold-dark': '#b8860b',
        'chip-red': '#c41e3a',
        'chip-blue': '#1e5aa8',
        'chip-green': '#228b22',
        'chip-black': '#1a1a1a',
        'chip-white': '#f5f5f5',
        // Existing pkr-* aliases (keep for backwards compat)
        'pkr-green': {
          950: '#0a1f14',
          900: '#0d2818',
          800: '#1a472a',
          700: '#2d5a3d',
          600: '#3d7a52',
        },
        'pkr-gold': {
          600: '#b8860b',
          500: '#d4af37',
          400: '#e4c45a',
          300: '#f5deb3',
          200: '#faf0d6',
        }
      },
      fontFamily: {
        'display': ['Oswald', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Roboto Mono', 'monospace'],
      },
      backgroundImage: {
        'felt-texture': 'radial-gradient(ellipse at center, #1a472a 0%, #0d2818 100%)',
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
