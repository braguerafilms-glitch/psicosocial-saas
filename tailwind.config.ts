import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0d14",
        surface:    "#10131e",
        card:       "#161929",
        border:     "#1f2540",
        accent:     "#5b7fff",
        muted:      "#6b7799",
        foreground: "#e9edf8",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card":    "0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)",
        "card-lg": "0 4px 16px 0 rgb(0 0 0 / 0.5)",
        "glow":    "0 0 0 1px rgba(91,127,255,0.25), 0 0 20px -4px rgba(91,127,255,0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
