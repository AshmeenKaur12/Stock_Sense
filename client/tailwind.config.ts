import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import { fontFamily } from 'tailwindcss/defaultTheme';

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1440px' } },
    // Spec breakpoints: 480 · 768 · 1024 · 1440 (sm/xl kept for finer control).
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', ...fontFamily.sans],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', ...fontFamily.mono],
      },
      fontSize: {
        h1: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        h2: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.012em', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
      },
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        success: { DEFAULT: token('success'), foreground: token('success-foreground') },
        warning: { DEFAULT: token('warning'), foreground: token('warning-foreground') },
        info: { DEFAULT: token('info'), foreground: token('info-foreground') },
        brand: { from: token('brand-from'), via: token('brand-via'), to: token('brand-to') },
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 4px)',
        xl: 'var(--radius)',
        lg: 'calc(var(--radius) - 2px)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        glow: '0 0 0 1px hsl(var(--primary) / 0.25), 0 8px 32px -8px hsl(var(--primary) / 0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, hsl(var(--brand-from)) 0%, hsl(var(--brand-via)) 55%, hsl(var(--brand-to)) 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, hsl(var(--brand-from) / 0.14) 0%, hsl(var(--brand-via) / 0.12) 55%, hsl(var(--brand-to) / 0.10) 100%)',
      },
      transitionTimingFunction: { brand: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      transitionDuration: { micro: '150ms', panel: '250ms' },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        flash: { '0%': { backgroundColor: 'hsl(var(--primary) / 0.25)' }, '100%': { backgroundColor: 'transparent' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.6s infinite',
        shake: 'shake 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        flash: 'flash 1.2s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
