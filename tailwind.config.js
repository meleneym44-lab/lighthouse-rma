/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'lh-blue': '#3B7AB4',
        'lh-dark': '#1E3A5F',
        'lh-yellow': '#F4C430',
        'lh-light': '#E8F2F8',
      },
    },
  },
  plugins: [],
}
