/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#08080f',
          card: '#11111c',
          elevated: '#16162a',
          input: '#1a1a2e',
        },
        line: {
          subtle: '#0e0e1a',
          DEFAULT: '#161625',
          bright: '#1e1e32',
        },
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(139, 92, 246, 0.18), transparent 70%)',
      },
    },
  },
  plugins: [],
}
