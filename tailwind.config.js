/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        neonLime: "#d9ff00",
        darkCard: "#121212",
        cardBorder: "#262626",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Syncopate", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #d9ff00",
        brutalWhite: "4px 4px 0px 0px #ffffff",
        neonGlow: "0 0 15px rgba(217, 255, 0, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
      },
    },
  },
  plugins: [],
}
