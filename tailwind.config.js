/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    extend: {
      // Nibble Brand Color Palette
      colors: {
        // Primary Colors
        fresh: "#48C78E",      // 🍏 Fresh Green - anchors the "fresh food" identity
        charcoal: "#2E2E2E",   // 🖤 Charcoal - strong background or text anchor
        
        // Secondary Accent Colors  
        citrus: "#FF8A4C",     // 🍊 Citrus Orange - highlight buttons / calls-to-action
        berry: "#FF4D6D",      // 🍓 Berry Pink - playful accent for highlights/notifications
        offwhite: "#FAFAFA",   // 🌱 Off White - base background to keep it clean
        
        // Neutral Support Colors
        neutral: {
          50: "#FAFAFA",   // offwhite
          100: "#F5F5F5",
          200: "#E5E5E5", 
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#2E2E2E",  // charcoal
          900: "#171717",
        }
      },
      
      // Typography System
      fontFamily: {
        'heading': ['Poppins-Bold', 'system'],
        'accent': ['Poppins-SemiBold', 'system'], 
        'body': ['Inter', 'SF Pro Text', 'system'],
      },
      
      fontSize: {
        xs: "10px",
        sm: "12px", 
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
        "7xl": "64px",
        "8xl": "72px",
        "9xl": "80px",
      },
      
      // Modern spacing and effects
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      
      animation: {
        'nibble': 'nibble 0.3s ease-in-out',
        'check': 'check 0.2s ease-in-out',
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};
