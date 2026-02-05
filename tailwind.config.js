/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: '#C9A24D',
        dark: '#2E2E2E',
        midGrey: '#6B6B6B',
        secondary: '#F3F4F6'
      }
    },
  },
  plugins: [],
}
