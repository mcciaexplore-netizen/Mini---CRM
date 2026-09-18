/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0176D3",
        "primary-hover": "#0166BE",
        secondary: "#032D60",
        accent: "#06A59A",
        background: "#F3F3F3",
        surface: "#FFFFFF",
        "text-primary": "#181818",
        "text-secondary": "#444444",
        success: "#2E844A",
        warning: "#DD7A01",
        error: "#BA0517",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: "8px",
        input: "6px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06)",
      }
    },
  },
  plugins: [],
};
