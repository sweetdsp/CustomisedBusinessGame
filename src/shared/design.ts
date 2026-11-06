// Single source of truth for look and feel (section 20.9). Starter values; restyled in stage 11.
export const COLORS = {
  stateTN: '#1b3a8c', // dark blue
  stateKL: '#0f6b3a', // dark green
  stateKA: '#f06ba8', // pink
  stateAP: '#9b1c1c', // dark red
  stateTG: '#f5c518', // yellow
  cream: '#fff6e0',
  gold: '#d4a017',
  maroon: '#5a0f1f',
  ink: '#2a1a14',
  white: '#ffffff',
} as const;

export const FONTS = {
  display: "'Baloo 2', 'Trebuchet MS', system-ui, sans-serif",
  body: "'Nunito', system-ui, sans-serif",
  sizeBase: '18px',
  sizeLarge: '28px',
  sizeHuge: '56px',
} as const;

export const SPACING = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' } as const;
export const RADII = { sm: '8px', md: '16px', lg: '28px', pill: '999px' } as const;
export const SHADOWS = {
  soft: '0 4px 12px rgba(90, 15, 31, 0.25)',
  lifted: '0 10px 24px rgba(90, 15, 31, 0.35)',
} as const;

export const BUTTON_MIN_HEIGHT = '48px';

// Animation timings in milliseconds
export const TIMINGS = {
  press: 120,
  tokenHop: 250,
  diceTumble: 900,
  banner: 1800,
  celebrate: 1500,
} as const;

// Indian comma style, e.g. 300000 -> "₹3,00,000"
export function formatRupees(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}
