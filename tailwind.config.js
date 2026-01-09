/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'lighthouse-blue': '#3B7AB4',
        'lighthouse-dark': '#1E3A5F',
        'lighthouse-yellow': '#F4C430',
      },
    },
  },
  plugins: [],
}
