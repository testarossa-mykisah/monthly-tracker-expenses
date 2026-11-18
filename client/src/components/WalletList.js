// Daftar dompet. Saldo ditampilkan dari server (sepanjang waktu) dan
// TIDAK dihitung ulang di klien.

import { formatRupiah } from '../format.js';

export function renderWalletList(wallets, callbacks) {
  const list = document.getElementById('walletList');
  list.innerHTML = '';
  wallets.forEach((wallet, index) => {
    const li = document.createElement('li');
    li.className = 'wallet-tile' + (index % 2 === 1 ? ' is-alt' : '');
    const main = document.createElement('div');
    main.className = 'wallet-main';
    const name = document.createElement('span');
    name.className = 'wallet-name';
    name.textContent = wallet.name;
    const balance = document.createElement('span');
    balance.className = 'wallet-balance';
    balance.textContent = formatRupiah(wallet.balance);
    main.appendChild(name);
    main.appendChild(balance);
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.textContent = 'Ubah';
    editBtn.setAttribute('aria-label', 'Ubah dompet ' + wallet.name);
    editBtn.addEventListener('click', () => callbacks.onEdit(wallet));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.textContent = 'Hapus';
    delBtn.setAttribute('aria-label', 'Hapus dompet ' + wallet.name);
    delBtn.addEventListener('click', () => callbacks.onDelete(wallet));
    li.appendChild(main);
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}
