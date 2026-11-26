/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saturn: {
          dark: '#050505',
          base: '#0B0B0D',
          light: '#1A1A20',
          accent: '#00FF66',
          accentHover: '#00CC52',
        }
      }
    },
  },
  plugins: [],
}
