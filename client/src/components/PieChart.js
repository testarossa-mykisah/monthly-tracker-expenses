// Pie chart pengeluaran per kategori (bulan yang dipilih): warna solid
// datar, pemisah putih tipis, label % hanya untuk irisan >= 10%, dan legenda
// terurut terbesar dulu dengan persentase bulat ("<1%" untuk di bawah 1%).

import { CATEGORY_COLORS, formatRupiah, monthLabel } from '../format.js';

function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function piePath(cx, cy, r, startAngle, endAngle) {
  const s = ((startAngle - 90) * Math.PI) / 180;
  const e = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  if (endAngle - startAngle >= 359.999) {
    return (
      'M ' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z'
    );
  }
  return (
    'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' Z'
  );
}

export function renderPieChart(transactions, viewedMonth) {
  const groups = {};
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const cat = tx.category || 'Lainnya';
    groups[cat] = (groups[cat] || 0) + (Number(tx.amount) || 0);
    totalExpense += Number(tx.amount) || 0;
  }

  const emptyEl = document.getElementById('pieEmpty');
  const bodyEl = document.getElementById('pieBody');
  const svg = document.getElementById('pieSvg');
  const legend = document.getElementById('pieLegend');
  if (totalExpense <= 0) {
    document.getElementById('pieEmptyText').textContent =
      'Belum ada pengeluaran ' + monthLabel(viewedMonth) + '.';
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    svg.innerHTML = '';
    legend.innerHTML = '';
    return;
  }
  emptyEl.hidden = true;
  bodyEl.hidden = false;

  const entries = Object.keys(groups)
    .map((category) => ({ category, amount: groups[category] }))
    .sort((a, b) => b.amount - a.amount);

  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  let angle = 0;
  for (const entry of entries) {
    const exactPct = (entry.amount / totalExpense) * 100;
    const sweep = (entry.amount / totalExpense) * 360;
    const color = CATEGORY_COLORS[entry.category] || '#9aa38b';
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', piePath(100, 100, 80, angle, angle + sweep));
    path.setAttribute('fill', color);
    const title = document.createElementNS(NS, 'title');
    title.textContent = entry.category + ': ' + formatRupiah(entry.amount);
    path.appendChild(title);
    svg.appendChild(path);
    if (exactPct >= 10) {
      const mid = (((angle + sweep / 2 - 90) * Math.PI) / 180);
      const tx = 100 + 52 * Math.cos(mid);
      const ty = 100 + 52 * Math.sin(mid);
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', String(tx));
      text.setAttribute('y', String(ty));
      text.setAttribute('fill', luminance(color) > 0.4 ? '#141414' : '#ffffff');
      text.textContent = Math.round(exactPct) + '%';
      svg.appendChild(text);
    }
    angle += sweep;
  }

  legend.innerHTML = '';
  for (const entry of entries) {
    const exactPct = (entry.amount / totalExpense) * 100;
    const pctText = exactPct < 1 ? '<1%' : Math.round(exactPct) + '%';
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = CATEGORY_COLORS[entry.category] || '#9aa38b';
    dot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'legend-name';
    name.textContent = entry.category + ' · ' + pctText;
    const value = document.createElement('span');
    value.className = 'legend-value';
    value.textContent = formatRupiah(entry.amount);
    li.appendChild(dot);
    li.appendChild(name);
    li.appendChild(value);
    legend.appendChild(li);
  }
}
