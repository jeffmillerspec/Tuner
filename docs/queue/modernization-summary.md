# Queue UI Modernization Summary

Files: src/main.js (queue-item/index/title, rmq, setupQueueKeyboard, ARIA listbox); src/styles.css (#queue-list vars, hover/active/focus-visible, tokenized scrollbars on .layout/ul/#queue-list); scripts/repair-queue-ui.mjs; tests/smoke.mjs queue-modern check.

Tokens: --tuner-accent hover/active, --tuner-scrollbar-track/thumb/hover/active, --tuner-scrollbar-size, --tuner-scrollbar-radius.

Album art: omitted (no artwork field).

Performance: no virtualization; 5000-item render ~190ms documented in smoke-report.md.

Test: npm run dev; npm run smoke (0 failures).
