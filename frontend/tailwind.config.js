/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // One Dark–inspired palette for dark mode
        od: {
          950: '#1a1d23',  // deepest bg
          900: '#21252b',  // app background
          800: '#282c34',  // surfaces / panels
          700: '#2c313a',  // raised / hover states
          600: '#3b4048',  // borders
          500: '#4b5263',  // very muted
          400: '#636d83',  // muted / secondary text
          300: '#7a8699',  // dim text
          200: '#abb2bf',  // primary text
          100: '#c8cdd6',  // bright text / headings
          50:  '#dde3ec',  // lightest accent
        },
      },
    },
  },
  plugins: [],
}
