// Kartu ringkasan hitam: Jumlah Uang + Sisa (dihitung server) dan
// progress bar pengeluaran. Tidak ada paragraf definisi di kartu ini.

import { formatRupiah } from '../format.js';

export function renderSummaryCard(summary) {
  const totalEl = document.getElementById('totalMoney');
  const remainingEl = document.getElementById('remainingMoney');
  totalEl.textContent = formatRupiah(summary.total);
  remainingEl.textContent = formatRupiah(summary.remaining);
  remainingEl.classList.toggle('is-negative', summary.remaining < 0);

  let pct = 0;
  let over = false;
  if (summary.expense > 0) {
    if (summary.total <= 0) {
      pct = 100;
      over = true;
    } else {
      pct = Math.round((summary.expense / summary.total) * 100);
      over = summary.remaining < 0;
      if (pct > 100) pct = 100;
    }
  }
  const bar = document.getElementById('progressBar');
  const fill = document.getElementById('progressFill');
  const pill = document.getElementById('progressPill');
  fill.style.width = pct + '%';
  fill.classList.toggle('is-over', over);
  pill.textContent = pct + '%';
  pill.classList.toggle('is-over', over);
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuetext', pct + '%' + (over ? ', melebihi batas' : ''));

  const overLabel = document.getElementById('overLabel');
  if (summary.remaining < 0) {
    overLabel.textContent =
      'Melebihi ' + formatRupiah(Math.abs(summary.remaining)) + ' dari Jumlah Uang.';
    overLabel.hidden = false;
  } else if (summary.remaining === 0 && summary.expense > 0) {
    overLabel.textContent = 'Sisa sudah Rp0. Pengeluaran sudah mencapai Jumlah Uang.';
    overLabel.hidden = false;
  } else {
    overLabel.hidden = true;
    overLabel.textContent = '';
  }
}
