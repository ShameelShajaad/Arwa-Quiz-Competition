tailwind.config = {
  theme: {
    extend: {
      colors: {
        onyx: "#0B0908",
        brown: { DEFAULT: "#1C1410", mid: "#2E2013", light: "#4A3420" },
        gold: { DEFAULT: "#D4AF37", bright: "#F4D03F", soft: "#E8C766" },
        ink: "#F5EFE6",
        muted: "#B8A98C",
        correct: "#2F9E63",
        wrong: "#B3423A",
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 40px rgba(212,175,55,0.35)",
        goldSm: "0 0 18px rgba(212,175,55,0.25)",
      },
    },
  },
};
