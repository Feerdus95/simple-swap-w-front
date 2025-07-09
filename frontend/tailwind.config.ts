import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
        background: "#222831",
        foreground: "#EEEEEE",
        card: {
          DEFAULT: "#393E46",
          foreground: "#EEEEEE",
        },
        popover: {
          DEFAULT: "#393E46",
          foreground: "#EEEEEE",
        },
        primary: {
          DEFAULT: "#00ADB5",
          foreground: "#EEEEEE",
          50: "#f0fdfe",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#00ADB5",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        secondary: {
          DEFAULT: "#393E46",
          foreground: "#EEEEEE",
        },
        muted: {
          DEFAULT: "#393E46",
          foreground: "#EEEEEE",
        },
        accent: {
          DEFAULT: "#00ADB5",
          foreground: "#EEEEEE",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#EEEEEE",
        },
        border: "#393E46",
        input: "#393E46",
        ring: "#00ADB5",
      },
      backgroundImage: {
        "gradient-dark": "linear-gradient(135deg, #222831 0%, #393E46 100%)",
        "gradient-primary": "linear-gradient(135deg, #00ADB5 0%, #0891b2 100%)",
        "gradient-card": "linear-gradient(135deg, #393E46 0%, #222831 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
