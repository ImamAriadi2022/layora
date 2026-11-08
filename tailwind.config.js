/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        app: 'var(--app-bg)',
        panel: 'var(--panel-bg)',
        'panel-muted': 'var(--panel-muted)',
        canvas: 'var(--canvas-bg)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-subtle': 'var(--accent-subtle)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        control: '6px',
        menu: '8px',
        panel: '8px',
        dialog: '10px',
      },
      boxShadow: {
        floating: '0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
        dialog: '0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.10)',
      },
      fontSize: {
        'page-title': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'panel-title': ['13px', { lineHeight: '18px', fontWeight: '600' }],
        body: ['13px', { lineHeight: '19px', fontWeight: '400' }],
        secondary: ['12px', { lineHeight: '17px', fontWeight: '400' }],
        label: ['11px', { lineHeight: '15px', fontWeight: '500' }],
        meta: ['11px', { lineHeight: '14px', fontWeight: '400' }],
        btn: ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
