import { IThemeRGB } from '../types';

/**
 * Default light theme — Azzas 2154 identity
 * Navy (#274566), warm neutrals, blue accents
 */
export const defaultTheme: IThemeRGB = {
  // Text colors
  'rgb-text-primary': '0 0 0', // #000000 (ink)
  'rgb-text-secondary': '89 89 89', // #595959 (ink-soft)
  'rgb-text-secondary-alt': '89 89 89', // #595959 (ink-soft)
  'rgb-text-tertiary': '153 153 153', // #999999 (ink-faint)
  'rgb-text-warning': '245 158 11', // #f59e0b (amber-500)

  // Ring colors
  'rgb-ring-primary': '39 69 102', // #274566 (navy)

  // Header colors
  'rgb-header-primary': '255 255 255', // #FFFFFF (white)
  'rgb-header-hover': '249 246 234', // #F9F6EA (surface-cream)
  'rgb-header-button-hover': '249 246 234', // #F9F6EA (surface-cream)

  // Surface colors
  'rgb-surface-active': '197 217 237', // #C5D9ED (blue-light)
  'rgb-surface-active-alt': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-hover': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-hover-alt': '197 217 237', // #C5D9ED (blue-light)
  'rgb-surface-primary': '255 255 255', // #FFFFFF (white)
  'rgb-surface-primary-alt': '249 246 234', // #F9F6EA (surface-cream)
  'rgb-surface-primary-contrast': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-secondary': '249 246 234', // #F9F6EA (surface-cream)
  'rgb-surface-secondary-alt': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-tertiary': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-tertiary-alt': '255 255 255', // #FFFFFF (white)
  'rgb-surface-dialog': '255 255 255', // #FFFFFF (white)
  'rgb-surface-submit': '39 69 102', // #274566 (navy)
  'rgb-surface-submit-hover': '61 90 115', // #3D5A73 (steel)
  'rgb-surface-destructive': '185 28 28', // #b91c1c (red-700)
  'rgb-surface-destructive-hover': '153 27 27', // #991b1b (red-800)
  'rgb-surface-chat': '255 255 255', // #FFFFFF (white)

  // Border colors
  'rgb-border-light': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-border-medium': '197 217 237', // #C5D9ED (blue-light)
  'rgb-border-medium-alt': '197 217 237', // #C5D9ED (blue-light)
  'rgb-border-heavy': '153 153 153', // #999999 (ink-faint)
  'rgb-border-xheavy': '89 89 89', // #595959 (ink-soft)

  // Brand colors
  'rgb-brand-purple': '39 69 102', // #274566 (navy)

  // Presentation
  'rgb-presentation': '255 255 255', // #FFFFFF (white)

  // Utility colors
  'rgb-background': '255 255 255',
  'rgb-foreground': '0 0 0',
  'rgb-primary': '197 217 237',
  'rgb-primary-foreground': '0 0 0',
  'rgb-secondary': '249 246 234',
  'rgb-secondary-foreground': '89 89 89',
  'rgb-muted': '232 232 228',
  'rgb-muted-foreground': '153 153 153',
  'rgb-accent': '232 232 228',
  'rgb-accent-foreground': '0 0 0',
  'rgb-destructive-foreground': '0 0 0',
  'rgb-border': '197 217 237',
  'rgb-input': '232 232 228',
  'rgb-ring': '39 69 102',
  'rgb-card': '249 246 234',
  'rgb-card-foreground': '0 0 0',
};
