// Dialog konfirmasi hapus. Mengembalikan Promise<boolean>: true hanya bila
// tombol "Ya, hapus" ditekan; Batal, Escape, dan klik backdrop = false.

import { closeModal, openModal } from '../modal.js';

let resolver = null;
let settled = false;

function settle(value) {
  if (settled) return;
  settled = true;
  const r = resolver;
  resolver = null;
  if (r) r(value);
}

export function initConfirmDialog() {
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    settle(true);
    closeModal(document.getElementById('confirmModal'));
  });
}

export function confirmDialog(title, text) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  settled = false;
  return new Promise((resolve) => {
    resolver = resolve;
    openModal('confirmModal', {
      onClose: () => settle(false),
    });
  });
}
