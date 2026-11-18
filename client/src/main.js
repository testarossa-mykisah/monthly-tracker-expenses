// Entry point. State bulan yang dilihat hanya di memori; semua data berasal
// dari API (getMonthData). Tidak ada localStorage: klien hanya bicara ke
// server, dan error API selalu ditampilkan secara eksplisit.

import { api } from './api.js';
import { currentMonthKey, formatRupiah, monthLabel } from './format.js';
import { initModalInfra } from './modal.js';
import { renderMonthNav, initMonthNav } from './components/MonthNav.js';
import { renderSummaryCard } from './components/SummaryCard.js';
import { renderPieChart } from './components/PieChart.js';
import { renderWalletList } from './components/WalletList.js';
import { renderHistoryList } from './components/HistoryList.js';
import { confirmDialog, initConfirmDialog } from './components/ConfirmDialog.js';
import { showToast } from './components/Toast.js';
import {
  initTransactionModal,
  openTransactionModal,
} from './components/TransactionModal.js';
import { initTransferModal, openTransferModal } from './components/TransferModal.js';
import { initWalletModal, openWalletModal } from './components/WalletModal.js';

let viewedMonth = currentMonthKey();
let monthData = null;

function showPageError(message) {
  document.getElementById('pageErrorText').textContent = message;
  document.getElementById('pageError').hidden = false;
}

function hidePageError() {
  document.getElementById('pageError').hidden = true;
  document.getElementById('pageErrorText').textContent = '';
}

function renderAll() {
  if (!monthData) return;
  renderMonthNav(viewedMonth);
  renderSummaryCard(monthData.summary);
  renderPieChart(monthData.transactions, viewedMonth);
  renderWalletList(monthData.wallets, {
    onEdit: (wallet) =>
      openWalletModal({
        existing: wallet,
        onSaved: async ({ isEdit }) => {
          await reload();
          showToast(isEdit ? 'Dompet diperbarui.' : 'Dompet ditambahkan.');
        },
      }),
    onDelete: (wallet) => requestDeleteWallet(wallet),
  });
  renderHistoryList(monthData.history, monthData.wallets, viewedMonth, {
    onEditTransaction: (item) =>
      openTransactionModal({
        type: item.type,
        existing: item,
        wallets: monthData.wallets,
        viewedMonth,
        onSaved: handleTransactionSaved,
      }),
    onDeleteTransaction: (item) => requestDeleteTransaction(item),
    onEditTransfer: (item) =>
      openTransferModal({
        existing: item,
        wallets: monthData.wallets,
        viewedMonth,
        onSaved: handleTransferSaved,
      }),
    onDeleteTransfer: (item) => requestDeleteTransfer(item),
  });
}

async function reload() {
  try {
    monthData = await api.getMonthData(viewedMonth);
    hidePageError();
    renderAll();
  } catch (err) {
    showPageError(err.message || 'Gagal memuat data dari server.');
    showToast(err.message || 'Gagal memuat data dari server.');
  }
}

async function handleTransactionSaved({ destMonth, isEdit }) {
  await reload();
  if (destMonth !== viewedMonth) {
    showToast('Tersimpan di ' + monthLabel(destMonth) + '.');
  } else {
    showToast(isEdit ? 'Entri diperbarui.' : 'Entri tersimpan.');
  }
}

async function handleTransferSaved({ destMonth, isEdit }) {
  await reload();
  if (destMonth !== viewedMonth) {
    showToast('Transfer tersimpan di ' + monthLabel(destMonth) + '.');
  } else {
    showToast(isEdit ? 'Transfer diperbarui.' : 'Transfer tersimpan.');
  }
}

async function requestDeleteTransaction(item) {
  const label = String(item.description || '').trim() || (item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan');
  const ok = await confirmDialog('Hapus entri ini?', label + ' — ' + formatRupiah(item.amount) + '.');
  if (!ok) return;
  try {
    await api.deleteTransaction(item.id);
    await reload();
    showToast('Entri dihapus.');
  } catch (err) {
    showToast(err.message || 'Gagal menghapus. Coba lagi.');
  }
}

async function requestDeleteTransfer(item) {
  const ok = await confirmDialog(
    'Hapus transfer ini?',
    'Transfer ' + formatRupiah(item.amount) + ' akan dihapus dan saldo dompet kembali seperti sebelum transfer.'
  );
  if (!ok) return;
  try {
    await api.deleteTransfer(item.id);
    await reload();
    showToast('Transfer dihapus.');
  } catch (err) {
    showToast(err.message || 'Gagal menghapus. Coba lagi.');
  }
}

async function requestDeleteWallet(wallet) {
  // Penolakan akhir tetap di server; klien tidak menebak-nebak riwayat.
  const ok = await confirmDialog('Hapus dompet ini?', 'Dompet ' + wallet.name + ' akan dihapus.');
  if (!ok) return;
  try {
    await api.deleteWallet(wallet.id);
    await reload();
    showToast('Dompet dihapus.');
  } catch (err) {
    showToast(err.message || 'Gagal menghapus. Coba lagi.');
  }
}

function openNewTransaction(type) {
  if (!monthData) return;
  openTransactionModal({
    type,
    existing: null,
    wallets: monthData.wallets,
    viewedMonth,
    onSaved: handleTransactionSaved,
  });
}

initModalInfra();
initConfirmDialog();
initTransactionModal();
initTransferModal();
initWalletModal();
initMonthNav(
  () => viewedMonth,
  (nextMonth) => {
    viewedMonth = nextMonth;
    reload();
  }
);

document.querySelectorAll('[data-open-expense]').forEach((btn) => {
  btn.addEventListener('click', () => openNewTransaction('expense'));
});
document.querySelectorAll('[data-open-income]').forEach((btn) => {
  btn.addEventListener('click', () => openNewTransaction('income'));
});
document.getElementById('openTransferBtn').addEventListener('click', () => {
  if (!monthData) return;
  openTransferModal({
    existing: null,
    wallets: monthData.wallets,
    viewedMonth,
    onSaved: handleTransferSaved,
  });
});
document.getElementById('addWalletBtn').addEventListener('click', () => {
  openWalletModal({
    existing: null,
    onSaved: async ({ isEdit }) => {
      await reload();
      showToast(isEdit ? 'Dompet diperbarui.' : 'Dompet ditambahkan.');
    },
  });
});
document.getElementById('pageRetryBtn').addEventListener('click', () => {
  reload();
});

reload();
