// Header + navigasi bulan: panah sebelum/sesudah, label bulan Indonesia,
// dan tombol "Bulan ini" yang hanya muncul saat melihat bulan lain.

import { currentMonthKey, monthLabel, shiftMonthKey } from '../format.js';

export function renderMonthNav(viewedMonth) {
  document.getElementById('monthLabel').textContent = monthLabel(viewedMonth);
  document.getElementById('thisMonthBtn').hidden = viewedMonth === currentMonthKey();
}

export function initMonthNav(getViewedMonth, onChange) {
  document.getElementById('prevMonth').addEventListener('click', () => {
    onChange(shiftMonthKey(getViewedMonth(), -1));
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    onChange(shiftMonthKey(getViewedMonth(), 1));
  });
  document.getElementById('thisMonthBtn').addEventListener('click', () => {
    onChange(currentMonthKey());
  });
}
