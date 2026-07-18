/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"], 
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f0',
          500: '#228B22',
          900: '#145214',
        }
      }
    }
  },
  plugins: [],
}