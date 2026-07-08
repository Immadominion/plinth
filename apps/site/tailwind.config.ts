import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // near-black, a touch warmer than pure #000; shades kept for dark sections + hovers
        ink: { DEFAULT: "#0A0A0A", 900: "#070707", 800: "#171717", 700: "#262626" },
        // near-white page (not yellowy); "200" is a cool gray for subtle section banding
        bone: { DEFAULT: "#FAFAFA", 200: "#F5F5F5" },
        // the single accent — used sparingly (primary CTAs, the occasional dot)
        // DEFAULT is the vibrant brand accent (dots, tints, large headings — 3:1 large-text).
        // 600/700 are the AA-safe deeper jades for white-text buttons/pills + small jade text.
        jade: { DEFAULT: "#0FA37F", 600: "#0B8366", 700: "#0A7458", 400: "#3BC0A1", 100: "#DCF1EA" },
        // secondary text
        mid: "#737373",
      },
      fontFamily: {
        // The Touchline type system: Satoshi carries body/UI…
        sans: ['"Satoshi"', "system-ui", "-apple-system", "sans-serif"],
        // …Clash Display carries every heading (legacy aliases fold onto it)
        display: ['"Clash Display"', '"Satoshi"', "system-ui", "sans-serif"],
        poster: ['"Clash Display"', '"Satoshi"', "system-ui", "sans-serif"],
        serif: ['"Clash Display"', '"Satoshi"', "system-ui", "sans-serif"],
        // …and JetBrains Mono carries numbers, amounts, and code
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
      },
      keyframes: {
        // a slim arrow that nudges forward, twice, then resets — "forward forward"
        nudge: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(3px)" },
          "40%": { transform: "translateX(0)" },
          "60%": { transform: "translateX(3px)" },
          "80%": { transform: "translateX(0)" },
        },
        // gentle float for the behind-the-pylon ghost word
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        // seamless logo marquee (content is duplicated → -50% loops cleanly)
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        // video modal entrance — backdrop fades, panel fades+settles
        "modal-backdrop": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "modal-panel": {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        nudge: "nudge 2.4s ease-in-out infinite",
        floaty: "floaty 9s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        "modal-backdrop": "modal-backdrop 0.2s ease-out",
        "modal-panel": "modal-panel 0.24s cubic-bezier(0.22,0.72,0.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;
