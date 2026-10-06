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
        background: '#0d1117',
        surface: '#161d27',
        surfaceHover: '#1f2836',
        card: '#131923',
        border: '#273344',
        borderLight: '#384860',
        brand: {
          teal: '#0d9488',
          tealLight: '#14b8a6',
          amber: '#f59e0b',
          amberLight: '#fbbf24',
          blue: '#0284c7',
          blueLight: '#38bdf8',
          coral: '#f43f5e',
          lime: '#84cc16',
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
