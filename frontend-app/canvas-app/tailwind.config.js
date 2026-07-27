/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f1ff',
          100: '#ece8ff',
          200: '#dcd3ff',
          300: '#cbc2ff',
          400: '#ad6cfc',
          500: '#5a2cfc',
          600: '#4a24d6',
          700: '#3d1eaf',
          800: '#301887',
          900: '#24125f',
        }
      }
    },
  },
  plugins: [],
}
