/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-favorite': 'var(--accent-favorite)',
        'border-color': 'var(--border)',
        'tag-bg': 'var(--tag-bg)',
        'danger': 'var(--danger)',
      },
      fontFamily: {
        lora: ['Lora', 'serif'],
        'source-serif': ['"Source Serif 4"', 'serif'],
        'dm-sans': ['"DM Sans"', 'sans-serif'],
        'frank-ruhl': ['"Frank Ruhl Libre"', 'serif'],
        assistant: ['Assistant', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        pill: '20px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(44,36,32,0.08)',
        'card-hover': '0 4px 16px rgba(44,36,32,0.12)',
      },
    },
  },
  plugins: [],
};
