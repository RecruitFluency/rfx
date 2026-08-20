/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          0: '#050505',
          1: '#0A0A0B',
          2: '#101012',
          3: '#16161A',
        },
        paper: {
          0: '#F5F5F3',
          1: '#C9C9CE',
          2: '#8A8A93',
          3: '#5A5A63',
        },
        crimson: {
          400: '#FF2E3F',
          500: '#E5192C',
          700: '#8F0E1B',
          900: '#3D060C',
        },
        cobalt: {
          400: '#5C74FF',
          500: '#3D5AFE',
          700: '#2038B8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Inter Tight"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        line: 'rgba(245,245,243,0.08)',
        'line-2': 'rgba(245,245,243,0.16)',
        'line-red': 'rgba(229,25,44,0.35)',
        'line-blue': 'rgba(61,90,254,0.35)',
      },
      boxShadow: {
        'glow-red': '0 0 24px rgba(255,46,63,0.22)',
        'glow-red-lg': '0 0 44px rgba(255,46,63,0.30)',
        'glow-blue': '0 0 24px rgba(61,90,254,0.25)',
        'drop-red': '0 40px 120px -20px rgba(229,25,44,0.35)',
        'drop-blue': '0 40px 120px -20px rgba(61,90,254,0.35)',
        card: '0 18px 44px rgba(0,0,0,0.55)',
      },
      borderRadius: {
        card: '16px',
        banner: '24px',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};
