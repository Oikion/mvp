/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}", // Tremor module
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
		/**
		 * Oikion Design System - Font Families
		 * Body: Inter (sans-serif)
		 */
		fontFamily: {
			sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
		},
  		colors: {
			/**
			 * Oikion Design System - Surface Colors
			 * surface-1: Page background (lowest elevation)
			 * surface-2: Card background (medium elevation)
			 * surface-3: Elevated card background (highest elevation)
			 */
			surface: {
				1: 'hsl(var(--surface-1))',
				2: 'hsl(var(--surface-2))',
				3: 'hsl(var(--surface-3))',
			},
			/**
			 * State Colors
			 * error, warning, success, info with foreground variants
			 */
			error: {
				DEFAULT: 'hsl(var(--error))',
				foreground: 'hsl(var(--error-foreground))',
			},
			warning: {
				DEFAULT: 'hsl(var(--warning))',
				foreground: 'hsl(var(--warning-foreground))',
			},
			success: {
				DEFAULT: 'hsl(var(--success))',
				foreground: 'hsl(var(--success-foreground))',
			},
			info: {
				DEFAULT: 'hsl(var(--info))',
				foreground: 'hsl(var(--info-foreground))',
			},
			/**
			 * Button-specific colors - Theme-aware button colors
			 * These override default colors for buttons to match theme aesthetics
			 */
			'button-primary': {
				DEFAULT: 'hsl(var(--button-primary))',
				foreground: 'hsl(var(--button-primary-foreground))',
			},
			'button-secondary': {
				DEFAULT: 'hsl(var(--button-secondary))',
				foreground: 'hsl(var(--button-secondary-foreground))',
			},
			'button-success': {
				DEFAULT: 'hsl(var(--button-success))',
				foreground: 'hsl(var(--button-success-foreground))',
			},
			'button-destructive': {
				DEFAULT: 'hsl(var(--button-destructive))',
				foreground: 'hsl(var(--button-destructive-foreground))',
			},
			/**
			 * Text Colors
			 */
			'text-primary': 'hsl(var(--text-primary))',
			'text-secondary': 'hsl(var(--text-secondary))',
  			tremor: {
  				brand: {
  					faint: '#f3f4f6',
  					muted: '#d1d5db',
  					subtle: '#9ca3af',
  					DEFAULT: '#111827',
  					emphasis: '#1f2937',
  					inverted: '#ffffff'
  				},
  				background: {
  					muted: '#f9fafb',
  					subtle: '#f3f4f6',
  					DEFAULT: '#ffffff',
  					emphasis: '#374151'
  				},
  				border: {
  					DEFAULT: '#e5e7eb'
  				},
  				ring: {
  					DEFAULT: '#e5e7eb'
  				},
  				content: {
  					subtle: '#9ca3af',
  					DEFAULT: '#6b7280',
  					emphasis: '#374151',
  					strong: '#111827',
  					inverted: '#ffffff'
  				}
  			},
  			'dark-tremor': {
  				brand: {
  					faint: '#1f2937',
  					muted: '#374151',
  					subtle: '#4b5563',
  					DEFAULT: '#f9fafb',
  					emphasis: '#d1d5db',
  					inverted: '#030712'
  				},
  				background: {
  					muted: '#111827',
  					subtle: '#1f2937',
  					DEFAULT: '#030712',
  					emphasis: '#d1d5db'
  				},
  				border: {
  					DEFAULT: '#1f2937'
  				},
  				ring: {
  					DEFAULT: '#1f2937'
  				},
  				content: {
  					subtle: '#9ca3af',
  					DEFAULT: '#d1d5db',
  					emphasis: '#e5e7eb',
  					strong: '#f9fafb',
  					inverted: '#000000'
  				}
  			},
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
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
		/**
		 * Oikion Design System - Elevation/Shadow System
		 * 5 levels of elevation for proper visual hierarchy
		 * Theme-aware shadows adapt to light/dark modes
		 */
  		boxShadow: {
			'elevation-0': 'none',
			'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.05)', /* Subtle card shadow - light mode */
			'elevation-2': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', /* Card */
			'elevation-3': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', /* Modal/popover */
			'elevation-4': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)', /* Top layer */
			/**
			 * Skeuomorphic button shadows - Theme-aware
			 * Light themes: inner shadows only (no outer shadows)
			 * Dark themes: darker inner shadows only
			 */
			'skeuo': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), inset 0 -3px 6px 0 rgba(0, 0, 0, 0.3)', /* Light mode - inner highlight + inner bottom shadow only */
			'skeuo-secondary': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.4)', /* Light mode secondary - reduced bottom shadow with 60% transparency */
			'dark-skeuo': 'inset 0 -4px 8px 0 rgba(0, 0, 0, 0.95)', /* Dark mode - very dark, highly opaque inner shadow only */
			'dark-skeuo-secondary': 'inset 0 -3px 6px 0 rgba(0, 0, 0, 0.4)', /* Dark mode secondary - reduced bottom shadow with 60% transparency */
			/**
			 * Skeuomorphic shadows for pressed/active state (flatter, inverted appearance)
			 */
			'skeuo-pressed': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.15)',
			'dark-skeuo-pressed': 'inset 0 2px 6px 0 rgba(0, 0, 0, 0.8), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.02)',
			/**
			 * Dark mode shadows (more intense)
			 */
			'dark-elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
			'dark-elevation-2': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
			'dark-elevation-3': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
			'dark-elevation-4': '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
			/**
			 * Tremor compatibility
			 */
  			'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  			'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  			'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  			'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  			'dark-tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  			'dark-tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
  		},
		/**
		 * Oikion Design System - Spacing Scale
		 * Based on 4px base unit for consistency
		 */
		spacing: {
			'0.5': '0.125rem', /* 2px */
			'1': '0.25rem', /* 4px */
			'1.5': '0.375rem', /* 6px */
			'2': '0.5rem', /* 8px */
			'2.5': '0.625rem', /* 10px */
			'3': '0.75rem', /* 12px */
			'4': '1rem', /* 16px */
			'5': '1.25rem', /* 20px */
			'6': '1.5rem', /* 24px */
			'8': '2rem', /* 32px */
			'10': '2.5rem', /* 40px */
			'12': '3rem', /* 48px */
			'16': '4rem', /* 64px */
		},
		/**
		 * Oikion Design System - Typography Scale
		 * Typography scale - Uses Inter for all text
		 */
  		fontSize: {
			/**
			 * Heading scales
			 */
			'h1': ['3rem', { lineHeight: '1.2', fontWeight: '700' }], /* 48px */
			'h2': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }], /* 36px */
			'h3': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }], /* 30px */
			'h4': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }], /* 24px */
			/**
			 * Body text
			 */
			'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }], /* 16px */
			'caption': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }], /* 14px */
			/**
			 * Tremor compatibility
			 */
  			'tremor-label': [
  				'0.75rem'
  			],
  			'tremor-default': [
  				'0.875rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			],
  			'tremor-title': [
  				'1.125rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'tremor-metric': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem'
  				}
  			]
  		},
		/**
		 * Oikion Design System - Border Radius Scale
		 * Small: 4px, Medium: 8px, Large: 12px, XL: 16px, 2XL: 24px
		 */
		borderRadius: {
			'sm': '4px', /* Small */
			'md': '8px', /* Medium */
			'lg': '12px', /* Large */
			'xl': '16px', /* XL */
			'2xl': '24px', /* 2XL */
			/**
			 * Dynamic radius based on CSS variable
			 */
			'base': 'var(--radius)',
			/**
			 * Tremor compatibility
			 */
			'tremor-small': '0.375rem',
			'tremor-default': '0.5rem',
			'tremor-full': '9999px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
			},
			/**
			 * Oikion Design System - Standard Animations
			 */
			fadeIn: {
				from: { opacity: '0' },
				to: { opacity: '1' },
			},
			fadeOut: {
				from: { opacity: '1' },
				to: { opacity: '0' },
			},
			slideUp: {
				from: { transform: 'translateY(10px)', opacity: '0' },
				to: { transform: 'translateY(0)', opacity: '1' },
			},
			slideDown: {
				from: { transform: 'translateY(-10px)', opacity: '0' },
				to: { transform: 'translateY(0)', opacity: '1' },
			},
		},
		/**
		 * Oikion Design System - Transition Durations
		 * Fast: 150ms, Default: 200ms, Slow: 300ms
		 */
		transitionDuration: {
			'fast': '150ms',
			'default': '200ms',
			'slow': '300ms',
		},
		/**
		 * Oikion Design System - Transition Timing Functions
		 * ease-in-out: default, ease-out: hover, ease-in: active
		 */
		transitionTimingFunction: {
			'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
			'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
			'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			/**
			 * Standard transitions for interactive elements
			 */
			'fade-in': 'fadeIn 200ms ease-in-out',
			'fade-out': 'fadeOut 200ms ease-in-out',
			'slide-up': 'slideUp 200ms ease-out',
			'slide-down': 'slideDown 200ms ease-out',
  		}
  	}
  },
  //tremor
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  //end tremor
  plugins: [require("tailwindcss-animate")],
};
