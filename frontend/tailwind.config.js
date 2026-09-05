/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC', // slate-50
        surface: '#FFFFFF',    // white
        primary: '#059669',    // emerald-600
        'primary-light': '#ECFDF5', // emerald-50
        'text-main': '#0F172A', // slate-900
        'text-muted': '#64748B', // slate-500
        'border-light': '#E2E8F0', // slate-200
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      }
    },
  },
  plugins: [],
}
