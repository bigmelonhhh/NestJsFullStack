/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  important: "#root",
  theme: {
    extend: {
      colors: {
        primary: "#1C1917", // 深炭黑
        secondary: "#44403C", // 暖灰
        cta: "#CA8A04", // 金色 CTA
        accent: "#A16207", // 金色 hover/active
        surface: "#FAFAF9", // 页面底色
        dark: "#0C0A09", // 正文文字
      },
      fontFamily: {
        heading: ["Cormorant", "serif"],
        body: ["Montserrat", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.08)",
        "glass-hover": "0 12px 40px rgba(0, 0, 0, 0.12)",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
      },
      transitionDuration: {
        fluid: "500ms",
      },
    },
  },
  plugins: [],
}
