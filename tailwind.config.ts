import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#0A0E1F',
          deep:    '#05070F',
          soft:    '#131730',
          veil:    '#1B2040',
        },
        parchment: {
          DEFAULT: '#F1E8D0',
          deep:    '#E8DCC0',
          light:   '#F8F2DE',
          shade:   '#D6C8A3',
        },
        ink: {
          DEFAULT: '#231A0E',
          soft:    '#4A3E2C',
          faint:   '#8A7B5E',
        },
        gold: {
          DEFAULT: '#C9971F',
          bright:  '#E6B54D',
          dim:     '#8A6518',
          foil:    '#D9B558',
        },
        oxblood:   '#7A1D1D',
        verdigris: '#4D7C6A',
        star:      '#E8D89A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'Georgia', 'serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        parchment: '0 40px 80px -30px rgba(0,0,0,0.85), 0 8px 24px -8px rgba(0,0,0,0.4)',
        seal:      '0 6px 16px -4px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
