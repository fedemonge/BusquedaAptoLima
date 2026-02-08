import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#28cfe2',
          dark: '#1fb8c9',
          light: '#5edced',
        },
        charcoal: '#1a1d1e',
        dark: '#2d3436',
        darker: '#1e2324',
        grey: {
          DEFAULT: '#b3babd',
          dark: '#8a9295',
          light: '#d4d9db',
        },
        light: '#f0f3f4',
        'off-white': '#f8fafb',
      },
      fontFamily: {
        heading: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        'teal': '0 10px 40px rgba(40, 207, 226, 0.25)',
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'card-lg': '0 10px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
