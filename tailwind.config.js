/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1400px'
    },
    extend: {
      // Apple-inspired color palette
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        // Apple accent colors
        'apple-blue': '#007AFF',
        'apple-green': '#34C759',
        'apple-red': '#FF3B30',
        'apple-orange': '#FF9500',
        'apple-purple': '#AF52DE',
        'apple-teal': '#5AC8FA',
        // Apple gray scale (light)
        'apple-gray': {
          50: '#FAFAFA',
          100: '#F5F5F7',
          200: '#E8E8ED',
          300: '#D2D2D7',
          400: '#AEAEB2',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#3A3A3C',
          900: '#1D1D1F',
        },
        // Category colors
        'category-telegram': '#007AFF',
        'category-terminal': '#FF9500',
        'category-mobile': '#AF52DE',
        'category-evm': '#5AC8FA',
        'category-monad': '#BF5AF2',
      },
      // Apple-inspired border radius
      borderRadius: {
        'none': '0',
        'sm': '6px',
        'DEFAULT': '10px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        '2xl': '24px',
        'full': '9999px',
      },
      // Apple-inspired shadows
      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.04)',
        'sm': '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'DEFAULT': '0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        'md': '0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        'lg': '0 8px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
        'xl': '0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)',
        'card': '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'dropdown': '0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        // Dark mode shadows
        'dark-sm': '0 2px 8px rgba(0,0,0,0.3)',
        'dark-md': '0 4px 16px rgba(0,0,0,0.4)',
        'dark-lg': '0 8px 32px rgba(0,0,0,0.5)',
      },
      // Apple-inspired spacing
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'apple-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'dropdown-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'dropdown-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(-8px)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'dropdown-in': 'dropdown-in 0.2s ease-out',
        'dropdown-out': 'dropdown-out 0.15s ease-in',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
      // Apple system font stack
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'SF Mono',
          'SFMono-Regular',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      // Apple-inspired font sizes
      fontSize: {
        'display': ['34px', { lineHeight: '1.1', fontWeight: '700' }],
        'title-1': ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        'title-2': ['22px', { lineHeight: '1.25', fontWeight: '600' }],
        'title-3': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        'callout': ['14px', { lineHeight: '1.45', fontWeight: '400' }],
        'subhead': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'footnote': ['12px', { lineHeight: '1.35', fontWeight: '400' }],
        'caption': ['11px', { lineHeight: '1.3', fontWeight: '400' }],
      },
      // Max widths for content
      maxWidth: {
        'content': '1400px',
      },
    }
  },
  plugins: [require('tailwindcss-animate')],
}
