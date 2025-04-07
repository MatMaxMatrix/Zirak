/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-down": {
          from: { height: 0 },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: 0 },
        },
        "pulse-slow": {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 0.3 },
        },
        "shine": {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shine": "shine 1.5s infinite",
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url('data:image/png;base64,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')",
      },
    },
  },
  safelist: [
    'from-blue-500/20',
    'to-indigo-500/10',
    'from-emerald-500/20',
    'to-green-500/10',
    'from-purple-500/20',
    'to-fuchsia-500/10',
    'bg-blue-500/80',
    'bg-emerald-500/80',
    'bg-purple-500/80',
    'bg-blue-500/20',
    'bg-emerald-500/20',
    'bg-purple-500/20',
    'bg-blue-400',
    'bg-emerald-400',
    'bg-purple-400',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'hover:bg-blue-700',
    'hover:bg-emerald-700',
    'hover:bg-purple-700',
    'from-blue-400',
    'to-purple-400',
    'from-blue-400',
    'to-blue-600',
    'from-emerald-400',
    'to-emerald-600',
    'from-purple-400',
    'to-purple-600',
    'group-hover:bg-purple-500/30',
    'text-blue-400',
    'text-emerald-400',
    'text-purple-400',
    'text-green-400',
    'text-green-300',
    'group-hover:text-purple-300',
  ],
  plugins: [require("tailwindcss-animate")],
} 