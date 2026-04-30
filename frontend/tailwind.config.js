/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        saffron: { 50: '#fff7ed', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
        teal: { 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
        slate: { 800: '#1e293b', 900: '#0f172a' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
