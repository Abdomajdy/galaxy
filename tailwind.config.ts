import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        galaxy: {
          purple: '#7F77DD',
          teal:   '#1D9E75',
          ink:    '#1A1830',
          cloud:  '#F7F6FC',
          mist:   '#ECEAF8',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
