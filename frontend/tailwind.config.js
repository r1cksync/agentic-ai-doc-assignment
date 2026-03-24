/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#6366F1",
        accent: "#22D3EE",
        surface: "#1E1E2E",
        card: "#2A2A3E",
        "card-hover": "#343450",
      },
    },
  },
  plugins: [],
};
