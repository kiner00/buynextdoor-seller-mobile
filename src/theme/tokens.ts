/**
 * Design tokens for the places Tailwind classes cannot reach — navigator
 * options, status-bar colours, chart fills. Values are the same peso green as
 * tailwind.config.js; that file is the source of truth for anything a
 * className can style.
 */
export const colors = {
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
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  white: '#ffffff',
} as const;

/**
 * Minimum tappable size. The web guide mandates 44×44px touch targets; on
 * native that is a hard floor, not a nicety — Apple's HIG says 44pt and
 * Android's Material says 48dp.
 */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_TARGET = 44;
