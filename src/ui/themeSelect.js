/** One-shot bind for #theme-select — populates options and wires runtime switching. */
export function bindThemeSelectOnce({ listThemes, applyTheme, subscribe, getThemeId }) {
  const sel = document.getElementById('theme-select');
  if (!sel || sel.dataset.bound === '1') return;
  sel.dataset.bound = '1';

  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const syncOptions = () => {
    const themes = listThemes();
    const cur = getThemeId?.() ?? themes[0]?.id ?? '';
    const ids = themes.map((t) => t.id);
    const existing = [...sel.options].map((o) => o.value);
    const changed = ids.length !== existing.length || ids.some((id, i) => id !== existing[i]);
    if (changed) {
      const focused = document.activeElement === sel;
      sel.innerHTML = themes
        .map((t) => `<option value="${esc(t.id)}">${esc(t.name || t.id)}</option>`)
        .join('');
      if (focused) sel.focus();
    }
    if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
  };

  syncOptions();
  subscribe(() => {
    const cur = getThemeId?.();
    if (cur && sel.value !== cur && [...sel.options].some((o) => o.value === cur)) {
      sel.value = cur;
    } else {
      syncOptions();
    }
  });
  sel.addEventListener('change', () => {
    applyTheme(sel.value, { persist: true });
  });
}
