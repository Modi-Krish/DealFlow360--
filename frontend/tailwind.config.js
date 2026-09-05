/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        surface: '#1E293B',
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#38BDF8',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      }
    },
  },
  plugins: [],
}
