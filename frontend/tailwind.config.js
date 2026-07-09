/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf4',
          100: '#dcf2e4',
          200: '#bbe5cc',
          300: '#87d0aa',
          400: '#4db37f',
          500: '#2e8b57',
          600: '#1a6b3c',
          700: '#165a32',
          800: '#14482a',
          900: '#123c23',
        },
        dairy: {
          green:  '#1A6B3C',
          light:  '#F0FAF4',
          border: '#C8E6C9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
