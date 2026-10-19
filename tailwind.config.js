/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // VEKT Coach Portal (brand guide v1.0)
      colors: {
        vekt: { black: '#0A0A0A', panel: '#111111', grey: '#888888', green: '#0CEAA1' },
      },
      fontFamily: {
        archivo: ['Archivo', 'Helvetica', 'Arial', 'sans-serif'],
        geist: ['Geist', 'system-ui', 'sans-serif'],
        'geist-mono': ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
