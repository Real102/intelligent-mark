/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#3730A3',
          light: '#818CF8',
        },
        surface: '#F8FAFC',
        border: '#E2E8F0',
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
        },
        danger: '#EF4444',
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        success: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
