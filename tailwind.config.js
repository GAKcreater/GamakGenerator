/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'proc-bg': '#18181b',
        'proc-panel': '#27272a',
        'proc-accent': '#4f46e5',
      }
    },
  },
  plugins: [],
}
