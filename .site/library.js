(() => {
  // No fetch or module imports: the library also works when opened as file://.
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const field = document.getElementById(button.dataset.copy);
      const status = document.getElementById(button.dataset.status);
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(field.value); copied = true; } catch (_) { /* Try local-file fallback. */ }
      }
      if (!copied) {
        field.focus(); field.select(); field.setSelectionRange(0, field.value.length);
        try { copied = document.execCommand('copy'); } catch (_) { /* Keep text selected. */ }
      }
      status.textContent = copied ? '已复制，可直接粘贴。' : '自动复制不可用，文本已选中，请按 ⌘C 或 Ctrl+C。';
      if (copied) button.focus();
    });
  });
  const search = document.querySelector('[data-search]');
  if (search) {
    const cards = [...document.querySelectorAll('[data-entry]')];
    const count = document.getElementById('result-count');
    const empty = document.getElementById('empty-state');
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase();
      let visible = 0;
      cards.forEach(card => {
        card.hidden = !card.dataset.entry.toLocaleLowerCase().includes(query);
        if (!card.hidden) visible++;
      });
      count.textContent = `${visible} / ${cards.length} 期`;
      empty.hidden = visible !== 0;
    });
  }
})();
