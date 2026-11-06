/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#EEF5F1',
          100: '#D8E8DF',
          200: '#B2D1C1',
          500: '#2C7A5E',
          700: '#1B5E47',
          800: '#164E3B',
          900: '#0F3A2C',
        },
        ember: {
          50: '#FEF4EC',
          100: '#FCE3D0',
          500: '#F28C45',
          700: '#B4561A',
        },
        canvas: '#F5F7F4',
        line: '#E1E6E2',
        ink: {
          DEFAULT: '#1E2925',
          soft: '#4A5752',
          mute: '#6B7873',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(22, 78, 59, 0.05), 0 6px 20px rgba(22, 78, 59, 0.06)',
        lift: '0 2px 4px rgba(22, 78, 59, 0.06), 0 14px 34px rgba(22, 78, 59, 0.12)',
      },
      borderRadius: {
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
