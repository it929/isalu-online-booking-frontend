/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0096e6",
          600: "#008ac9", // Official Isalu Logo Blue
          700: "#006bb3",
          800: "#004f85",
          900: "#023559",
          950: "#011c33",
        },
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 138, 201, 0.12)",
        glow: "0 0 25px -5px rgba(0, 138, 201, 0.3)",
      },
    },
  },
  plugins: [],
};
