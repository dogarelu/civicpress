/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #8A0808)',
        secondary: 'var(--color-secondary, #1a1a1a)',
        accent: 'var(--color-accent, #c0392b)',
        background: 'var(--color-background, #ffffff)',
        'text-main': 'var(--color-text, #2d2d2d)',
        muted: '#f7f7f7',
        border: '#e5e5e5',
      },
      fontFamily: {
        heading: ['var(--font-heading, Roboto)', 'sans-serif'],
        body: ['var(--font-body, Open Sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
