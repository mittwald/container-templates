#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Collect template data from all manifest.yaml files
TEMPLATES=$(node generate-index-data.mjs)

cat > index.html <<'HTMLEOF'
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Container Templates</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #1a1a2e; min-height: 100vh; }
  header { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 2rem 0; }
  .header-inner { max-width: 1280px; margin: 0 auto; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
  h1 { font-size: 1.5rem; font-weight: 700; }
  h1 span { color: #4f46e5; }
  .stats { display: flex; gap: 1.5rem; font-size: 0.85rem; color: #6b7280; }
  .stats b { color: #1a1a2e; }
  .toolbar { max-width: 1280px; margin: 0 auto; padding: 1.5rem 2rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .search { flex: 1; min-width: 220px; padding: 0.6rem 1rem 0.6rem 2.5rem; border-radius: 10px; border: 1px solid #d1d5db; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E") 0.75rem center no-repeat; color: #1a1a2e; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
  .search:focus { border-color: #4f46e5; }
  .search::placeholder { color: #9ca3af; }
  .filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .filter-btn { padding: 0.45rem 0.9rem; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; color: #6b7280; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
  .filter-btn:hover { border-color: #9ca3af; color: #1a1a2e; }
  .filter-btn.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  .grid { max-width: 1280px; margin: 0 auto; padding: 0 2rem 3rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; transition: all 0.25s; cursor: pointer; position: relative; overflow: hidden; }
  .card:hover { border-color: #c7d2fe; transform: translateY(-2px); box-shadow: 0 8px 24px #0000000d; }
  .card-head { display: flex; align-items: center; gap: 0.75rem; }
  .card-icon { width: 40px; height: 40px; border-radius: 10px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .card-icon img { width: 28px; height: 28px; object-fit: contain; }
  .card-title { font-size: 1rem; font-weight: 600; }
  .card-version { font-size: 0.7rem; color: #6b7280; background: #f3f4f6; padding: 0.15rem 0.45rem; border-radius: 4px; margin-left: 0.25rem; }
  .card-tagline { font-size: 0.85rem; color: #6b7280; line-height: 1.4; flex: 1; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .card-cats { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .cat-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 500; }
  .cat-productivity { background: #e0f2fe; color: #0369a1; }
  .cat-development { background: #dbeafe; color: #1d4ed8; }
  .cat-database { background: #ccfbf1; color: #0f766e; }
  .cat-ai { background: #f3e8ff; color: #7c3aed; }
  .cat-security { background: #ffedd5; color: #c2410c; }
  .cat-monitoring { background: #dcfce7; color: #15803d; }
  .cat-communication { background: #fae8ff; color: #a21caf; }
  .cat-media { background: #fef9c3; color: #a16207; }
  .cat-ecommerce { background: #ffe4e6; color: #be123c; }
  .card-license { font-size: 0.7rem; color: #9ca3af; }
  .modal-overlay { display: none; position: fixed; inset: 0; background: #00000033; z-index: 100; align-items: center; justify-content: center; padding: 2rem; }
  .modal-overlay.open { display: flex; }
  .modal { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 2rem; position: relative; box-shadow: 0 20px 60px #0000001a; }
  .modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #9ca3af; font-size: 1.5rem; cursor: pointer; line-height: 1; }
  .modal-close:hover { color: #1a1a2e; }
  .modal-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .modal-icon { width: 56px; height: 56px; border-radius: 14px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
  .modal-icon img { width: 40px; height: 40px; object-fit: contain; }
  .modal-title { font-size: 1.3rem; font-weight: 700; }
  .modal-dev { font-size: 0.85rem; color: #6b7280; }
  .modal-desc { font-size: 0.9rem; color: #6b7280; line-height: 1.6; margin-bottom: 1.25rem; }
  .modal-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
  .meta-item { font-size: 0.8rem; }
  .meta-label { color: #9ca3af; margin-bottom: 0.15rem; }
  .meta-value { color: #1a1a2e; }
  .meta-value a { color: #4f46e5; text-decoration: none; }
  .meta-value a:hover { text-decoration: underline; }
  .empty { text-align: center; padding: 4rem 2rem; color: #9ca3af; font-size: 1rem; grid-column: 1 / -1; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } .header-inner { flex-direction: column; align-items: flex-start; } }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <h1><span>Container</span> Templates</h1>
    <div class="stats"><span><b id="total-count">0</b> Templates</span><span><b id="cat-count">0</b> Kategorien</span></div>
  </div>
</header>
<div class="toolbar">
  <input class="search" type="text" placeholder="Templates durchsuchen..." id="search">
  <div class="filters" id="filters"></div>
</div>
<div class="grid" id="grid"></div>
<div class="modal-overlay" id="modal-overlay"><div class="modal" id="modal"></div></div>
<script>
HTMLEOF

# Inject template data
echo "const templates = ${TEMPLATES};" >> index.html

cat >> index.html <<'HTMLEOF'
const catLabels = { productivity:"Produktivität", development:"Entwicklung", database:"Datenbank", ai:"KI", security:"Sicherheit", monitoring:"Monitoring", communication:"Kommunikation", media:"Medien", ecommerce:"E-Commerce" };
function mdToHtml(md) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const blocks = md.trim().split(/\n\s*\n/);
  return blocks.map(b => {
    const lines = b.split('\n');
    if (lines.every(l => l.trim().startsWith('- '))) {
      return '<ul>' + lines.map(l => `<li>${inline(l.trim().slice(2))}</li>`).join('') + '</ul>';
    }
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('');
}
const allCats = [...new Set(templates.flatMap(t => t.categories))].sort();
document.getElementById('total-count').textContent = templates.length;
document.getElementById('cat-count').textContent = allCats.length;
const filtersEl = document.getElementById('filters');
const allBtn = document.createElement('button');
allBtn.className = 'filter-btn active'; allBtn.textContent = 'Alle'; allBtn.dataset.cat = '';
filtersEl.appendChild(allBtn);
allCats.forEach(c => { const btn = document.createElement('button'); btn.className = 'filter-btn'; btn.textContent = catLabels[c] || c; btn.dataset.cat = c; filtersEl.appendChild(btn); });
let activeCat = '';
filtersEl.addEventListener('click', e => { if (!e.target.classList.contains('filter-btn')) return; activeCat = e.target.dataset.cat; filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === activeCat)); render(); });
const searchEl = document.getElementById('search');
searchEl.addEventListener('input', render);
function render() {
  const q = searchEl.value.toLowerCase();
  const filtered = templates.filter(t => {
    if (activeCat && !t.categories.includes(activeCat)) return false;
    if (q && !t.name.includes(q) && !t.displayName.de.toLowerCase().includes(q) && !t.tagline.de.toLowerCase().includes(q) && !t.developer.toLowerCase().includes(q)) return false;
    return true;
  });
  const grid = document.getElementById('grid');
  if (!filtered.length) { grid.innerHTML = '<div class="empty">Keine Templates gefunden.</div>'; return; }
  grid.innerHTML = filtered.map(t => `
    <div class="card" data-name="${t.name}">
      <div class="card-head">
        <div class="card-icon"><img src="${t.name}/${t.icon}" alt="${t.displayName.de}" loading="lazy"></div>
        <div><span class="card-title">${t.displayName.de}</span><span class="card-version">${t.version}</span></div>
      </div>
      <div class="card-tagline">${t.tagline.de}</div>
      <div class="card-footer">
        <div class="card-cats">${t.categories.map(c => `<span class="cat-badge cat-${c}">${catLabels[c]||c}</span>`).join('')}</div>
        <span class="card-license">${t.license}</span>
      </div>
    </div>`).join('');
}
const overlay = document.getElementById('modal-overlay');
document.getElementById('grid').addEventListener('click', e => {
  const card = e.target.closest('.card'); if (!card) return;
  const t = templates.find(x => x.name === card.dataset.name); if (!t) return;
  document.getElementById('modal').innerHTML = `
    <button class="modal-close">&times;</button>
    <div class="modal-header">
      <div class="modal-icon"><img src="${t.name}/${t.icon}" alt="${t.displayName.de}"></div>
      <div><div class="modal-title">${t.displayName.de} <span class="card-version">${t.version}</span></div><div class="modal-dev">${t.developer}</div></div>
    </div>
    <div class="card-cats" style="margin-bottom:1rem">${t.categories.map(c => `<span class="cat-badge cat-${c}">${catLabels[c]||c}</span>`).join('')}</div>
    <div class="modal-desc">${mdToHtml(t.description.de)}</div>
    <div class="modal-meta">
      <div class="meta-item"><div class="meta-label">Website</div><div class="meta-value"><a href="${t.website}" target="_blank">${t.website.replace('https://','')}</a></div></div>
      <div class="meta-item"><div class="meta-label">Repository</div><div class="meta-value"><a href="${t.repository}" target="_blank">GitHub</a></div></div>
      <div class="meta-item"><div class="meta-label">Lizenz</div><div class="meta-value">${t.license}</div></div>
      <div class="meta-item"><div class="meta-label">Version</div><div class="meta-value">${t.version}</div></div>
    </div>`;
  overlay.classList.add('open');
});
overlay.addEventListener('click', e => { if (e.target === overlay || e.target.classList.contains('modal-close')) overlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });
render();
</script>
</body>
</html>
HTMLEOF

echo "index.html generated with $(echo "$TEMPLATES" | grep -o '"name"' | wc -l | tr -d ' ') templates."
