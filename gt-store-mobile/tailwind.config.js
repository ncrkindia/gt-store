// tailwind.config.js
module.exports = {
  // ...
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#030213',
        background: '#ffffff',
        foreground: '#030213',
        muted: '#717182',
        accent: '#e9ebef',
        destructive: '#d4183d',
      },
      borderRadius: {
        lg: 10,
        xl: 12,
      }
    },
  },
  plugins: [],
}
