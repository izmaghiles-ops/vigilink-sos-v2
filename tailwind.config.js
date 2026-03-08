/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        border:  'hsl(var(--border))',
        input:   'hsl(var(--input))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        ring: 'hsl(var(--ring))',
        sidebar: {
          DEFAULT:            'var(--sidebar)',
          foreground:         'var(--sidebar-foreground)',
          primary:            'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent:             'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border:             'var(--sidebar-border)',
          ring:               'var(--sidebar-ring)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'sos-pulse':   'sos-pulse 1.8s ease-in-out infinite',
        'sos-press':   'sos-press 0.4s ease-out forwards',
        'timer-danger': 'timer-danger 0.8s ease-in-out infinite',
        'sweep-in':    'sweep-in 0.4s ease-out forwards',
        'status-glow': 'status-glow 2s ease-in-out infinite',
        'alert-flash': 'alert-flash 1s ease-in-out infinite',
        'ripple':      'ripple 0.6s ease-out forwards',
        'spin':        'spin 1s linear infinite',
      },
      keyframes: {
        'sos-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0.7), 0 0 0 0 rgba(220,38,38,0.4)' },
          '50%':      { boxShadow: '0 0 0 30px rgba(220,38,38,0), 0 0 0 60px rgba(220,38,38,0)' },
        },
        'sos-press': {
          '0%':   { boxShadow: '0 0 0 0 rgba(220,38,38,0.9)' },
          '100%': { boxShadow: '0 0 0 80px rgba(220,38,38,0)' },
        },
        'timer-danger': {
          '0%, 100%': { color: 'rgb(220,38,38)' },
          '50%':      { color: 'rgb(255,100,100)' },
        },
        'sweep-in': {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'status-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(220,38,38,0.4)' },
          '50%':      { boxShadow: '0 0 24px rgba(220,38,38,0.8)' },
        },
        'alert-flash': {
          '0%, 100%': { background: 'rgba(220,38,38,0.15)' },
          '50%':      { background: 'rgba(220,38,38,0.35)' },
        },
        'ripple': {
          to: { transform: 'scale(3)', opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};
