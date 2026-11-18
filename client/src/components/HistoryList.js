// Riwayat bulan yang dipilih. Urutan sudah ditentukan server (tanggal
// terbaru, jam terbaru, tanpa jam terakhir, terbaru dibuat dulu); klien
// hanya menampilkan apa adanya. Transfer tampil tanpa +/-.

import { formatDateDisplay, formatRupiah, monthLabel } from '../format.js';

function rowLabel(item, walletsById) {
  if (item.kind === 'transfer') {
    const from = walletsById.get(item.fromWalletId);
    const to = walletsById.get(item.toWalletId);
    return 'Transfer ' + (from ? from.name : '?') + ' \u2192 ' + (to ? to.name : '?');
  }
  const desc = String(item.description || '').trim();
  if (desc) return desc;
  return item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan';
}

export function renderHistoryList(history, wallets, viewedMonth, callbacks) {
  const walletsById = new Map(wallets.map((w) => [w.id, w]));
  const list = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  list.innerHTML = '';
  if (history.length === 0) {
    emptyEl.textContent = 'Belum ada riwayat ' + monthLabel(viewedMonth) + '.';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  for (const item of history) {
    const li = document.createElement('li');
    li.className = 'history-row';
    const main = document.createElement('div');
    main.className = 'history-main';
    const desc = document.createElement('span');
    desc.className = 'history-desc';
    desc.textContent = rowLabel(item, walletsById);
    const meta = document.createElement('span');
    meta.className = 'history-meta';
    let metaText = formatDateDisplay(item.date);
    if (item.time) metaText += ' \u2022 ' + item.time;
    if (item.kind === 'transaction') {
      const w = walletsById.get(item.walletId);
      if (w) metaText += ' \u2022 ' + w.name;
    } else if (item.description && String(item.description).trim()) {
      metaText += ' \u2022 ' + String(item.description).trim();
    }
    meta.textContent = metaText;
    main.appendChild(desc);
    main.appendChild(meta);
    if (item.kind === 'transaction' && item.type === 'expense') {
      const pill = document.createElement('span');
      pill.className = 'category-pill';
      pill.textContent = item.category || 'Lainnya';
      main.appendChild(pill);
    }
    const amount = document.createElement('span');
    amount.className = 'history-amount';
    if (item.kind === 'transfer') {
      amount.textContent = formatRupiah(item.amount);
    } else if (item.type === 'expense') {
      amount.classList.add('is-expense');
      amount.textContent = '-' + formatRupiah(item.amount);
    } else {
      amount.classList.add('is-income');
      amount.textContent = '+' + formatRupiah(item.amount);
    }
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.textContent = 'Ubah';
    editBtn.setAttribute('aria-label', 'Ubah: ' + rowLabel(item, walletsById));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.textContent = 'Hapus';
    delBtn.setAttribute('aria-label', 'Hapus: ' + rowLabel(item, walletsById));
    if (item.kind === 'transaction') {
      editBtn.addEventListener('click', () => callbacks.onEditTransaction(item));
      delBtn.addEventListener('click', () => callbacks.onDeleteTransaction(item));
    } else {
      editBtn.addEventListener('click', () => callbacks.onEditTransfer(item));
      delBtn.addEventListener('click', () => callbacks.onDeleteTransfer(item));
    }
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(main);
    li.appendChild(amount);
    li.appendChild(actions);
    list.appendChild(li);
  }
}
