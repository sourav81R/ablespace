/**
 * Theme model.
 *
 * Two independent preferences, both persisted to localStorage:
 *   - mode:   light | dark
 *   - accent: one of six colours
 *
 * They are stored as device preferences rather than on the user record: a
 * person may reasonably want dark mode on one machine and light on another,
 * and it avoids a network round-trip before the first paint.
 */

export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const ACCENTS = ['amber', 'blue', 'pink', 'rose', 'emerald', 'black'] as const;
export type Accent = (typeof ACCENTS)[number];

export const MODE_STORAGE_KEY = 'ablespace.theme.mode';
export const ACCENT_STORAGE_KEY = 'ablespace.theme.accent';

export const DEFAULT_MODE: ThemeMode = 'light';
export const DEFAULT_ACCENT: Accent = 'emerald';

/** Human-readable labels, and the swatch shown in the colour menu. */
export const ACCENT_LABELS: Record<Accent, string> = {
  amber: 'Amber',
  blue: 'Blue',
  pink: 'Pink',
  rose: 'Rose',
  emerald: 'Emerald',
  black: 'Black',
};

/**
 * Swatch colours for the accent menu.
 *
 * Hard-coded rather than read from CSS variables because the menu shows all
 * six at once — only the active one is present in the cascade.
 */
export const ACCENT_SWATCHES: Record<Accent, string> = {
  amber: '#d97706',
  blue: '#2563eb',
  pink: '#db2777',
  rose: '#e11d48',
  emerald: '#0d9488',
  black: '#1e2430',
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && (ACCENTS as readonly string[]).includes(value);
}

/**
 * Applies both preferences to the document element.
 *
 * The single place that touches the DOM for theming, shared by the pre-paint
 * script and the React provider so the two can never disagree.
 */
export function applyTheme(mode: ThemeMode, accent: Accent): void {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.dataset.accent = accent;
}

/**
 * The script injected into <head> and run before first paint.
 *
 * Without this, the server renders the default theme and React corrects it
 * after hydration — a visible flash of the wrong colours on every load. Reading
 * localStorage synchronously here means the very first paint is already
 * correct.
 *
 * Written as a string because it must execute before React does. It is wrapped
 * in try/catch since localStorage throws in some privacy modes, in which case
 * falling back to the defaults is the right outcome.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('${MODE_STORAGE_KEY}');
    var accent = localStorage.getItem('${ACCENT_STORAGE_KEY}');
    var modes = ${JSON.stringify(THEME_MODES)};
    var accents = ${JSON.stringify(ACCENTS)};
    if (modes.indexOf(mode) === -1) mode = '${DEFAULT_MODE}';
    if (accents.indexOf(accent) === -1) accent = '${DEFAULT_ACCENT}';
    var root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    root.setAttribute('data-accent', accent);
  } catch (e) {
    document.documentElement.setAttribute('data-accent', '${DEFAULT_ACCENT}');
  }
})();
`.trim();
