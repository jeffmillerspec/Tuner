# Theme System Smoke Results

Date: 2026-09-19. OS: Windows. Runtime: Tauri WebView2 (`npm run dev`).

Default Abyssal Console: bg `#0f1117`, text `#eeeeee`, accent `#27d8c7` teal.

After Synthwave 94: accent `#ff6ad5` magenta; header, buttons, lists, queue update without reload.

After reload: theme restored from `tuner-data` localStorage before first paint (inline CSS prevents flash).

Focus: `:focus-visible` ring `#4eeaff` on buttons, inputs, theme select.

High contrast: DevTools `prefers-contrast: more` thickens borders and focus outlines.

Runtime check: `getComputedStyle(document.documentElement).getPropertyValue('--tuner-accent')` changes on `#theme-select` change.

Automated: `npm run smoke` passes all static integration checks.
