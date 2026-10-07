/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ['var(--font-sora)', 'Sora', 'sans-serif'],
        manrope: ['var(--font-manrope)', 'Manrope', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
      },
      colors: {
        background: '#fbfbfa',
        surface: '#ffffff',
        surfaceHover: '#f4f4f5',
        card: '#ffffff',
        border: '#e2e8f0',
        borderLight: '#f1f5f9',
        brand: {
          indigo: '#4f46e5',
          indigoLight: '#6366f1',
          teal: '#0d9488',
          tealLight: '#14b8a6',
          amber: '#d97706',
          amberLight: '#f59e0b',
          blue: '#2563eb',
          blueLight: '#3b82f6',
          coral: '#e11d48',
          lime: '#16a34a',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        blink: {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
      },
      animation: {
        float: 'float 3.2s ease-in-out infinite',
        blink: 'blink 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
