// Modal transfer antar dompet. Dompet asal tidak bisa dipilih sebagai
// tujuan. Peringatan (tanggal beda bulan, jumlah melebihi saldo asal)
// memakai konfirmasi kirim kedua dan tidak memblokir: server memang
// mengizinkan transfer melebihi saldo. Butuh minimal 2 dompet.

import { api } from '../api.js';
import {
  currentMonthKey,
  formatRupiah,
  isValidTime,
  monthKeyFromDate,
  monthLabel,
  nowTimeStr,
  parseAmountInput,
  parseDateParts,
  todayStr,
} from '../format.js';
import { closeModal, hideFieldMessage, openModal, showFieldMessage } from '../modal.js';
import { showToast } from './Toast.js';

let context = null;
let confirmed = false;

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

/* Saldo asal untuk peringatan: saldo sepanjang waktu dari server, dihitung
   seolah transfer yang sedang diubah belum ada. */
function sourceBalanceExcludingCurrent(fromId) {
  const wallet = context.wallets.find((w) => w.id === fromId);
  if (!wallet) return 0;
  let balance = wallet.balance;
  const existing = context.existing;
  if (existing) {
    if (existing.fromWalletId === fromId) balance += existing.amount;
    if (existing.toWalletId === fromId) balance -= existing.amount;
  }
  return balance;
}

function refreshToOptions() {
  const fromEl = document.getElementById('transferFrom');
  const toEl = document.getElementById('transferTo');
  const prevTo = toEl.value;
  const fromId = Number(fromEl.value);
  const opts = context.wallets
    .filter((w) => w.id !== fromId)
    .map((w) => ({ value: String(w.id), label: w.name }));
  fillSelect(toEl, opts, opts.some((o) => o.value === prevTo) ? prevTo : opts[0] ? opts[0].value : '');
  const fromWallet = context.wallets.find((w) => w.id === fromId);
  document.getElementById('transferFromBalance').textContent = fromWallet
    ? 'Saldo ' + fromWallet.name + ': ' + formatRupiah(sourceBalanceExcludingCurrent(fromId))
    : '';
}

function updateWarning() {
  const dateVal = document.getElementById('transferDate').value;
  const warningEl = document.getElementById('transferWarning');
  if (dateVal && monthKeyFromDate(dateVal) !== context.viewedMonth) {
    showFieldMessage(
      warningEl,
      'Tanggal ini masuk ke ' +
        monthLabel(monthKeyFromDate(dateVal)) +
        ', bukan ' +
        monthLabel(context.viewedMonth) +
        '.'
    );
  } else {
    hideFieldMessage(warningEl);
  }
}

export function openTransferModal(nextContext) {
  context = nextContext;
  const { existing, wallets, viewedMonth } = context;
  const form = document.getElementById('transferForm');
  form.reset();
  confirmed = false;
  hideFieldMessage(document.getElementById('transferError'));
  hideFieldMessage(document.getElementById('transferWarning'));
  document.getElementById('transferSubmit').textContent = 'Simpan';
  document.getElementById('transferTitle').textContent = existing ? 'Ubah Transfer' : 'Transfer antar Dompet';
  document.getElementById('transferId').value = existing ? String(existing.id) : '';

  const blocked = !existing && wallets.length < 2;
  document.getElementById('transferBlockedNote').hidden = !blocked;
  for (const fieldId of [
    'transferFrom',
    'transferTo',
    'transferAmount',
    'transferDescription',
    'transferDate',
    'transferTime',
    'transferSubmit',
  ]) {
    document.getElementById(fieldId).disabled = blocked;
  }

  fillSelect(
    document.getElementById('transferFrom'),
    wallets.map((w) => ({ value: String(w.id), label: w.name })),
    existing ? String(existing.fromWalletId) : wallets[0] ? String(wallets[0].id) : ''
  );
  refreshToOptions();
  if (existing) document.getElementById('transferTo').value = String(existing.toWalletId);
  refreshToOptions();
  if (existing) document.getElementById('transferTo').value = String(existing.toWalletId);
  document.getElementById('transferAmount').value = existing ? String(existing.amount) : '';
  document.getElementById('transferDescription').value = existing ? existing.description || '' : '';
  document.getElementById('transferDate').value = existing
    ? existing.date
    : defaultDateForView(viewedMonth);
  document.getElementById('transferTime').value = existing ? existing.time || '' : nowTimeStr();
  updateWarning();
  openModal('transferModal');
  if (blocked) showToast('Butuh minimal 2 dompet untuk transfer. Tambah dompet dulu.');
}

export function initTransferModal() {
  document.getElementById('transferFrom').addEventListener('change', () => {
    confirmed = false;
    document.getElementById('transferSubmit').textContent = 'Simpan';
    if (context) refreshToOptions();
  });
  document.getElementById('transferDate').addEventListener('change', () => {
    confirmed = false;
    document.getElementById('transferSubmit').textContent = 'Simpan';
    if (context) updateWarning();
  });
  document.getElementById('transferAmount').addEventListener('input', () => {
    confirmed = false;
    document.getElementById('transferSubmit').textContent = 'Simpan';
  });

  document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!context) return;
    const errorEl = document.getElementById('transferError');
    hideFieldMessage(errorEl);
    const idValue = document.getElementById('transferId').value;
    const id = idValue ? Number(idValue) : null;
    if (context.wallets.length < 2) {
      showFieldMessage(errorEl, 'Butuh minimal 2 dompet untuk transfer.');
      return;
    }
    const rawAmount = document.getElementById('transferAmount').value;
    const parsed = parseAmountInput(rawAmount, false);
    if (!parsed.ok) {
      showFieldMessage(errorEl, parsed.error);
      document.getElementById('transferAmount').focus();
      return;
    }
    const dateVal = document.getElementById('transferDate').value;
    if (!parseDateParts(dateVal)) {
      showFieldMessage(errorEl, 'Tanggal tidak valid. Pilih tanggal yang benar.');
      document.getElementById('transferDate').focus();
      return;
    }
    const timeVal = document.getElementById('transferTime').value;
    if (!isValidTime(timeVal)) {
      showFieldMessage(errorEl, 'Jam tidak valid. Gunakan format 24 jam, contoh: 19:45.');
      document.getElementById('transferTime').focus();
      return;
    }
    const fromId = Number(document.getElementById('transferFrom').value);
    const toId = Number(document.getElementById('transferTo').value);
    if (!fromId || !toId || fromId === toId) {
      showFieldMessage(errorEl, 'Dompet asal dan dompet tujuan harus berbeda.');
      return;
    }
    const warnings = [];
    const destMonth = monthKeyFromDate(dateVal);
    if (destMonth !== context.viewedMonth) {
      warnings.push('Entri ini akan tersimpan di ' + monthLabel(destMonth) + '.');
    }
    const sourceBalance = sourceBalanceExcludingCurrent(fromId);
    if (parsed.value > sourceBalance) {
      const fromWallet = context.wallets.find((w) => w.id === fromId);
      warnings.push(
        'Jumlah melebihi saldo ' +
          (fromWallet ? fromWallet.name : 'dompet asal') +
          ' (' +
          formatRupiah(sourceBalance) +
          '). Saldo boleh minus dan akan ditampilkan apa adanya.'
      );
    }
    if (warnings.length > 0 && !confirmed) {
      confirmed = true;
      showFieldMessage(
        document.getElementById('transferWarning'),
        warnings.join(' ') + ' Tekan Simpan sekali lagi untuk memastikan.'
      );
      document.getElementById('transferSubmit').textContent = 'Simpan saja';
      return;
    }
    const submitBtn = document.getElementById('transferSubmit');
    submitBtn.disabled = true;
    try {
      const body = {
        fromWalletId: fromId,
        toWalletId: toId,
        amount: rawAmount,
        description: document.getElementById('transferDescription').value,
        date: dateVal,
        time: timeVal === '' ? null : timeVal,
      };
      if (id) {
        await api.updateTransfer({ id, ...body });
      } else {
        await api.createTransfer(body);
      }
    } catch (err) {
      showFieldMessage(errorEl, err.message || 'Gagal menyimpan transfer. Coba lagi.');
      submitBtn.disabled = false;
      return;
    }
    submitBtn.disabled = false;
    closeModal(document.getElementById('transferModal'));
    context.onSaved({ destMonth, isEdit: Boolean(id) });
  });
}
