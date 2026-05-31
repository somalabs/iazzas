import { IThemeRGB } from '../types';

/**
 * Default light theme — Azzas 2154 identity
 * Navy (#274566), warm neutrals, blue accents
 */
export const defaultTheme: IThemeRGB = {
  // Text colors — ink scale (§1)
  'rgb-text-primary': '28 43 56', // #1C2B38 (ink-900)
  'rgb-text-secondary': '61 90 115', // #3D5A73 (ink-700 / steel)
  'rgb-text-secondary-alt': '61 90 115', // #3D5A73 (ink-700)
  'rgb-text-tertiary': '110 126 140', // #6E7E8C (ink-500)
  'rgb-text-warning': '245 158 11', // #f59e0b (amber-500)

  // Ring colors
  'rgb-ring-primary': '39 69 102', // #274566 (navy / action)

  // Header colors
  'rgb-header-primary': '255 255 255', // #FFFFFF (paper — régua)
  'rgb-header-hover': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-header-button-hover': '232 232 228', // #E8E8E4 (surface-warm)

  // Surface colors — duas elevações: canvas (creme) + paper (branco flutuante)
  'rgb-surface-active': '197 217 237', // #C5D9ED (blue-light)
  'rgb-surface-active-alt': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-hover': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-hover-alt': '197 217 237', // #C5D9ED (blue-light)
  'rgb-surface-primary': '249 246 234', // #F9F6EA (canvas — palco creme)
  'rgb-surface-primary-alt': '249 246 234', // #F9F6EA (canvas)
  'rgb-surface-primary-contrast': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-secondary': '249 246 234', // #F9F6EA (canvas)
  'rgb-surface-secondary-alt': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-tertiary': '232 232 228', // #E8E8E4 (surface-warm)
  'rgb-surface-tertiary-alt': '255 255 255', // #FFFFFF (paper)
  'rgb-surface-dialog': '255 255 255', // #FFFFFF (paper — flutuante)
  'rgb-surface-submit': '39 69 102', // #274566 (navy / action)
  'rgb-surface-submit-hover': '28 52 80', // #1C3450 (action-hover)
  'rgb-surface-destructive': '185 28 28', // #b91c1c (red-700)
  'rgb-surface-destructive-hover': '153 27 27', // #991b1b (red-800)
  'rgb-surface-chat': '249 246 234', // #F9F6EA (canvas)

  // Border colors — hairline quente (§1 rule), nunca cinza
  'rgb-border-light': '230 224 207', // #E6E0CF (rule)
  'rgb-border-medium': '230 224 207', // #E6E0CF (rule)
  'rgb-border-medium-alt': '230 224 207', // #E6E0CF (rule)
  'rgb-border-heavy': '61 90 115', // #3D5A73 (ink-700)
  'rgb-border-xheavy': '28 43 56', // #1C2B38 (ink-900)

  // Brand colors
  'rgb-brand-purple': '39 69 102', // #274566 (navy / action)

  // Presentation
  'rgb-presentation': '249 246 234', // #F9F6EA (canvas)

  // Utility colors
  'rgb-background': '249 246 234', // #F9F6EA (canvas)
  'rgb-foreground': '28 43 56', // #1C2B38 (ink-900)
  'rgb-primary': '197 217 237',
  'rgb-primary-foreground': '0 0 0',
  'rgb-secondary': '249 246 234',
  'rgb-secondary-foreground': '61 90 115',
  'rgb-muted': '232 232 228',
  'rgb-muted-foreground': '110 126 140',
  'rgb-accent': '232 232 228',
  'rgb-accent-foreground': '28 43 56',
  'rgb-destructive-foreground': '0 0 0',
  'rgb-border': '230 224 207',
  'rgb-input': '230 224 207',
  'rgb-ring': '39 69 102',
  'rgb-card': '255 255 255', // #FFFFFF (paper — cards flutuantes)
  'rgb-card-foreground': '28 43 56',
};
