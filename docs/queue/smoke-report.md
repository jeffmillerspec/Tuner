# Queue Smoke Report

Date: 2026-09-19. OS: Windows. Runtime: Tauri WebView2 via npm run dev.

Keyboard: ArrowUp/Down/Home/End and Enter/Space on queue rows (role=listbox/option). Playlist reorder via Up/Dn buttons unchanged.

Wheel: native scroll on #queue-list with themed thumb/track.

Theme toggle: getComputedStyle(document.documentElement).getPropertyValue('--tuner-scrollbar-thumb') updates without reload.

Performance 5000 items: render ~190ms, scroll ~10ms/frame, no virtualization (unchanged).

Platform: Windows WebView2 uses ::-webkit-scrollbar vars; macOS overlay may ignore size; Firefox uses scrollbar-color only.
