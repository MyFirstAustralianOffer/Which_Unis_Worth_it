/** Inline SVG icons (stroke style, 24×24 grid). */
const svg = (size, body) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  chevronDown: (s = 16) => svg(s, `<path d="m6 9 6 6 6-6"/>`),
  check: (s = 20) => svg(s, `<path d="M20 6 9 17l-5-5"/>`),
  lock: (s = 14) => svg(s, `<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`),
  shieldCheck: (s = 20) => svg(s, `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>`),
  eyeOff: (s = 20) => svg(s, `<path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.6 6.6C3.6 8.6 2 12 2 12s3 8 10 8a10.6 10.6 0 0 0 5.4-1.4"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="m2 2 20 20"/>`),
};
