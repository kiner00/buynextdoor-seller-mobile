/**
 * Mirrors the web monorepo's design tokens (@bnd/config/tailwind.css) so the
 * two products look like one brand.
 *
 * The web is on Tailwind 4 and declares the palette as `oklch()` inside
 * `@theme`. React Native's style engine parses neither `oklch()` nor CSS
 * custom properties, so the same scale is checked in here as sRGB hex,
 * converted from those exact oklch values. If the web palette moves, re-run
 * the conversion rather than eyeballing a new hex.
 *
 * Pinned to Tailwind 3.4 on purpose: NativeWind 4 compiles against 3.x, and
 * nothing here needs a v4-only feature. The class names we use are spelled
 * identically in both versions, so screens read the same as the web app.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf9ed',
          100: '#d4f1d4',
          200: '#a8e3a9',
          300: '#7acf7e',
          400: '#4db956',
          500: '#23a136',
          600: '#008819',
          700: '#006d09',
          800: '#005307',
          900: '#003a05',
        },
      },
      borderRadius: {
        md: 8,
        lg: 12,
      },
    },
  },
  plugins: [],
};
