# ThemeManager manual smoke

1. Cold load: default theme, no FOUC (inline :root in index.html).
2. #theme-select lists themes; switch updates body, header, panels, buttons, inputs, queue immediately.
3. Reload: theme persists via store settings.themeId.
4. Tab controls: focus-visible ring via --tuner-focus-ring.
5. Hover/press buttons and list items: shade states readable.
6. High contrast: prefers-contrast and forced-colors rules active.

Automated: `node tests/smoke.mjs` — expect TOTAL_FAILURES:0.
Log: tests/reports/smoke.log
