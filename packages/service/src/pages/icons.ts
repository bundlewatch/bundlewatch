import { html, type SafeHtml } from '../html.ts';

// Inline replacements for the Material Icons font, so results pages make no
// third-party requests. Paths from Material Design Icons (Apache-2.0). The
// `material-icons` class is kept for the 0.x markup and CSS.

const PATHS = {
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  close:
    'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  remove_circle:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z',
} as const;

export const icon = ({
  name,
  className,
  label,
  title,
}: {
  name: keyof typeof PATHS;
  className: string;
  label: string;
  title?: string | undefined;
}): SafeHtml =>
  html`<svg class="${className} material-icons" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="${label}">${title && html`<title>${title}</title>`}<path d="${PATHS[name]}"/></svg>`;
