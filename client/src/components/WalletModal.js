// Modal dompet (tambah/ubah). Nama duplikat (tanpa membedakan huruf)
// ditolak server dan pesannya ditampilkan di form. Saldo awal mentah
// dikirim apa adanya agar validasi server yang memutuskan.

import { api } from '../api.js';
import { parseAmountInput } from '../format.js';
import { closeModal, hideFieldMessage, openModal, showFieldMessage } from '../modal.js';

let context = null;

export function openWalletModal(nextContext) {
  context = nextContext;
  const { existing } = context;
  const form = document.getElementById('walletForm');
  form.reset();
  hideFieldMessage(document.getElementById('walletError'));
  document.getElementById('walletId').value = existing ? String(existing.id) : '';
  document.getElementById('walletTitle').textContent = existing ? 'Ubah Dompet' : 'Tambah Dompet';
  document.getElementById('walletName').value = existing ? existing.name : '';
  document.getElementById('walletInitial').value = existing ? String(existing.initialBalance) : '0';
  openModal('walletModal');
}

export function initWalletModal() {
  document.getElementById('walletForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!context) return;
    const errorEl = document.getElementById('walletError');
    hideFieldMessage(errorEl);
    const idValue = document.getElementById('walletId').value;
    const id = idValue ? Number(idValue) : null;
    const nameInput = document.getElementById('walletName');
    const name = nameInput.value.trim();
    if (!name) {
      showFieldMessage(errorEl, 'Nama dompet wajib diisi.');
      nameInput.focus();
      return;
    }
    const rawInitial = document.getElementById('walletInitial').value;
    const parsed = parseAmountInput(rawInitial, true);
    if (!parsed.ok) {
      showFieldMessage(errorEl, parsed.error);
      document.getElementById('walletInitial').focus();
      return;
    }
    const submitBtn = document.querySelector('#walletForm button[type="submit"]');
    submitBtn.disabled = true;
    try {
      if (id) {
        await api.updateWallet({ id, name, initialBalance: rawInitial });
      } else {
        await api.createWallet({ name, initialBalance: rawInitial });
      }
    } catch (err) {
      showFieldMessage(errorEl, err.message || 'Gagal menyimpan dompet. Coba lagi.');
      submitBtn.disabled = false;
      return;
    }
    submitBtn.disabled = false;
    closeModal(document.getElementById('walletModal'));
    context.onSaved({ isEdit: Boolean(id) });
  });
}
