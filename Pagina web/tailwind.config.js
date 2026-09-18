/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'at-blue': '#003366',
        'at-blue-light': '#004080',
      }
    },
  },
  plugins: [],
}