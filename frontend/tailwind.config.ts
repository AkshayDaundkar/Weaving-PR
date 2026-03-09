import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          border: "var(--bg-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        "chart-primary": "var(--chart-primary)",
        posthog: {
          orange: "var(--posthog-orange)",
          amber: "var(--posthog-amber)",
        },
        score: {
          high: "var(--score-high)",
          mid: "var(--score-mid)",
          low: "var(--score-low)",
        },
        momentum: {
          up: "var(--momentum-up)",
          flat: "var(--momentum-flat)",
          down: "var(--momentum-down)",
        },
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
    },
  },
  plugins: [],
};

export default config;
