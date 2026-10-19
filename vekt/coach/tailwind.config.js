// VEKT brand v1.0: matte black, panel, white, grey. Green is the one accent,
// one green element per screen, black text on green. 4px corners. No red.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vekt: { black: "#0A0A0A", panel: "#111111", line: "#1E1E1E", grey: "#888888", green: "#0CEAA1" },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: { DEFAULT: "4px", sm: "2px", md: "4px", lg: "4px" },
    },
  },
};
