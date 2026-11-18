// Modal transaksi (Pengeluaran / Pemasukan). Dropdown kategori hanya untuk
// pengeluaran; pemasukan dipaksa berkategori "Lainnya" di server. Tanggal
// di luar bulan yang dilihat memunculkan peringatan dan butuh konfirmasi
// kirim kedua, tetapi tidak pernah diblokir. Jumlah mentah dikirim apa
// adanya ke server agar validasi server yang memutuskan.

import { api } from '../api.js';
import {
  CATEGORIES,
  currentMonthKey,
  isValidTime,
  monthKeyFromDate,
  monthLabel,
  nowTimeStr,
  parseAmountInput,
  parseDateParts,
  todayStr,
} from '../format.js';
import { closeModal, hideFieldMessage, openModal, showFieldMessage } from '../modal.js';

let context = null;
let confirmedOutOfMonth = false;

function fillSelect(selectEl, options, selectedValue) {
  selectEl.innerHTML = '';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === selectedValue) o.selected = true;
    selectEl.appendChild(o);
  }
}

function defaultDateForView(viewedMonth) {
  if (viewedMonth === currentMonthKey()) return todayStr();
  return viewedMonth + '-01';
}

function updateWarning() {
  const dateVal = document.getElementById('txDate').value;
  const warningEl = document.getElementById('txWarning');
  if (dateVal && monthKeyFromDate(dateVal) !== context.viewedMonth) {
    showFieldMessage(
      warningEl,
      'Tanggal ini masuk ke ' +
        monthLabel(monthKeyFromDate(dateVal)) +
        ', bukan ' +
        monthLabel(context.viewedMonth) +
        '. Entri akan tampil saat kamu membuka bulan tersebut.'
    );
  } else {
    hideFieldMessage(warningEl);
  }
}

export function openTransactionModal(nextContext) {
  context = nextContext;
  const { type, existing, wallets, viewedMonth } = context;
  const form = document.getElementById('transactionForm');
  form.reset();
  confirmedOutOfMonth = false;
  hideFieldMessage(document.getElementById('txError'));
  hideFieldMessage(document.getElementById('txWarning'));
  document.getElementById('txSubmit').textContent = 'Simpan';
  document.getElementById('txSubmit').disabled = false;

  const effType = existing ? existing.type : type;
  document.getElementById('txId').value = existing ? String(existing.id) : '';
  document.getElementById('txType').value = effType;
  document.getElementById('transactionTitle').textContent =
    (existing ? 'Ubah ' : 'Catat ') + (effType === 'expense' ? 'Pengeluaran' : 'Pemasukan');

  const categoryField = document.getElementById('txCategoryField');
  const categorySelect = document.getElementById('txCategory');
  if (effType === 'expense') {
    categoryField.hidden = false;
    const opts = CATEGORIES.map((c) => ({ value: c, label: c }));
    const currentCat = existing ? existing.category || 'Lainnya' : 'Lainnya';
    if (opts.every((o) => o.value !== currentCat)) {
      opts.push({ value: currentCat, label: currentCat });
    }
    fillSelect(categorySelect, opts, currentCat);
  } else {
    categoryField.hidden = true;
    fillSelect(
      categorySelect,
      CATEGORIES.map((c) => ({ value: c, label: c })),
      'Lainnya'
    );
  }

  fillSelect(
    document.getElementById('txWallet'),
    wallets.map((w) => ({ value: String(w.id), label: w.name })),
    existing ? String(existing.walletId) : wallets[0] ? String(wallets[0].id) : ''
  );
  document.getElementById('txAmount').value = existing ? String(existing.amount) : '';
  document.getElementById('txDescription').value = existing ? existing.description || '' : '';
  document.getElementById('txDate').value = existing ? existing.date : defaultDateForView(viewedMonth);
  document.getElementById('txTime').value = existing ? existing.time || '' : nowTimeStr();
  updateWarning();
  openModal('transactionModal');
}

export function initTransactionModal() {
  document.getElementById('txDate').addEventListener('change', () => {
    confirmedOutOfMonth = false;
    document.getElementById('txSubmit').textContent = 'Simpan';
    if (context) updateWarning();
  });

  document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!context) return;
    const errorEl = document.getElementById('txError');
    hideFieldMessage(errorEl);
    const idValue = document.getElementById('txId').value;
    const id = idValue ? Number(idValue) : null;
    const type = document.getElementById('txType').value === 'income' ? 'income' : 'expense';
    const rawAmount = document.getElementById('txAmount').value;
    const parsed = parseAmountInput(rawAmount, false);
    if (!parsed.ok) {
      showFieldMessage(errorEl, parsed.error);
      document.getElementById('txAmount').focus();
      return;
    }
    const dateVal = document.getElementById('txDate').value;
    if (!parseDateParts(dateVal)) {
      showFieldMessage(errorEl, 'Tanggal tidak valid. Pilih tanggal yang benar.');
      document.getElementById('txDate').focus();
      return;
    }
    const timeVal = document.getElementById('txTime').value;
    if (!isValidTime(timeVal)) {
      showFieldMessage(errorEl, 'Jam tidak valid. Gunakan format 24 jam, contoh: 19:45.');
      document.getElementById('txTime').focus();
      return;
    }
    const walletId = Number(document.getElementById('txWallet').value);
    if (!Number.isSafeInteger(walletId) || !context.wallets.some((w) => w.id === walletId)) {
      showFieldMessage(errorEl, 'Pilih dompet dulu.');
      return;
    }
    const destMonth = monthKeyFromDate(dateVal);
    if (destMonth !== context.viewedMonth && !confirmedOutOfMonth) {
      confirmedOutOfMonth = true;
      showFieldMessage(
        document.getElementById('txWarning'),
        'Entri ini akan tersimpan di ' +
          monthLabel(destMonth) +
          '. Tekan Simpan sekali lagi untuk memastikan.'
      );
      document.getElementById('txSubmit').textContent = 'Simpan ke ' + monthLabel(destMonth);
      return;
    }
    const submitBtn = document.getElementById('txSubmit');
    submitBtn.disabled = true;
    try {
      const body = {
        type,
        amount: rawAmount,
        description: document.getElementById('txDescription').value,
        category:
          type === 'expense' ? document.getElementById('txCategory').value : 'Lainnya',
        walletId,
        date: dateVal,
        time: timeVal === '' ? null : timeVal,
      };
      if (id) {
        await api.updateTransaction({ id, ...body });
      } else {
        await api.createTransaction(body);
      }
    } catch (err) {
      showFieldMessage(errorEl, err.message || 'Gagal menyimpan. Coba lagi.');
      submitBtn.disabled = false;
      return;
    }
    submitBtn.disabled = false;
    closeModal(document.getElementById('transactionModal'));
    context.onSaved({ destMonth, isEdit: Boolean(id) });
  });
}
