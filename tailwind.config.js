/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: '#0f172a',
        muted: '#334155',
        line: '#e2e8f0',
        brand: '#2563eb',
        brand2: '#16a34a',
        soft: '#f8fafc',
        success: '#16a34a',
      },
    },
  },
  plugins: [],
}
