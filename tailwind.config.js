/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#0f1419",
        steel: "#1c2530",
        slate: "#4b5a6a",
        sand: "#d6dce4",
        ember: "#2558a6",
        cyan: "#3b82c4"
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-manrope)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 30px rgba(37, 88, 166, 0.35)",
        ember: "0 0 30px rgba(37, 88, 166, 0.3)"
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 20% 20%, rgba(59, 130, 196, 0.12), transparent 55%), radial-gradient(circle at 80% 10%, rgba(37, 88, 166, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(214, 220, 228, 0.08), transparent 60%)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.8s ease-out both",
        scroll: "scroll 30s linear infinite"
      }
    }
  },
  plugins: []
};
