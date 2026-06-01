/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Spectral'", 'Georgia', 'serif'],
        body: ["'Spectral'", 'Georgia', 'serif'],
        mono: ["'IBM Plex Mono'", 'monospace'],
        bengali: ["'Noto Sans Bengali'", 'sans-serif'],
      },
    },
  },
  plugins: [],
};
