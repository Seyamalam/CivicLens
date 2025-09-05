const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./lib/**/*.{js,ts,tsx}"],

	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				// CivicLens color palette
				primary: {
					50: '#f0fdfa',
					100: '#ccfbf1',
					200: '#99f6e4',
					300: '#5eead4',
					400: '#2dd4bf',
					500: '#0891b2', // Main primary - Teal
					600: '#0e7490',
					700: '#155e75',
					800: '#164e63',
					900: '#134e4a',
					DEFAULT: '#0891b2',
					foreground: '#ffffff',
				},
				secondary: {
					50: '#fff7ed',
					100: '#ffedd5',
					200: '#fed7aa',
					300: '#fdba74',
					400: '#fb923c',
					500: '#ea580c', // Main secondary - Orange
					600: '#dc2626',
					700: '#b91c1c',
					800: '#991b1b',
					900: '#7f1d1d',
					DEFAULT: '#ea580c',
					foreground: '#ffffff',
				},
				accent: {
					50: '#faf5ff',
					100: '#f3e8ff',
					200: '#e9d5ff',
					300: '#d8b4fe',
					400: '#c084fc',
					500: '#7c3aed', // Main accent - Violet
					600: '#7c2d12',
					700: '#6b21a8',
					800: '#581c87',
					900: '#4c1d95',
					DEFAULT: '#7c3aed',
					foreground: '#ffffff',
				},
				success: {
					50: '#f7fee7',
					100: '#ecfccb',
					200: '#d9f99d',
					300: '#bef264',
					400: '#a3e635',
					500: '#65a30d', // Success - Lime
					600: '#65a30d',
					700: '#4d7c0f',
					800: '#365314',
					900: '#1a2e05',
				},
				warning: {
					50: '#fffbeb',
					100: '#fef3c7',
					200: '#fde68a',
					300: '#fcd34d',
					400: '#fbbf24',
					500: '#d97706', // Warning - Amber
					600: '#b45309',
					700: '#92400e',
					800: '#78350f',
					900: '#451a03',
				},
				error: {
					50: '#fef2f2',
					100: '#fee2e2',
					200: '#fecaca',
					300: '#fca5a5',
					400: '#f87171',
					500: '#dc2626', // Error - Red
					600: '#b91c1c',
					700: '#991b1b',
					800: '#7f1d1d',
					900: '#450a0a',
				},
				// Keep existing theme colors for compatibility
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				radius: "var(--radius)",
			},
			borderRadius: {
				lg: '0.5rem',
				xl: '0.75rem',
				'2xl': '1rem',    // Main radius - used everywhere
				'3xl': '1.5rem',
				// Keep existing theme compatibility
				xlTheme: "calc(var(--radius) + 4px)",
				lgTheme: "var(--radius)",
				mdTheme: "calc(var(--radius) - 2px)",
				smTheme: "calc(var(--radius) - 4px)",
			},
			borderWidth: {
				hairline: hairlineWidth(),
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				heading: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
			},
		},
	},
	plugins: [],
};
