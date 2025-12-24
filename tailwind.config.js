/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PKR Night theme colors
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
      },
      fontFamily: {
        'display': ['Oswald', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Roboto Mono', 'monospace'],
      },
      backgroundImage: {
        'felt-texture': 'radial-gradient(ellipse at center, #1a472a 0%, #0d2818 100%)',
      }
    },
  },
  plugins: [],
}
