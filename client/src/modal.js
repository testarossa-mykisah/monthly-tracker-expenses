// Infrastruktur modal bersama: Escape, klik backdrop, focus trap,
// fokus awal + fokus kembali, dan kunci scroll. Dipakai semua komponen modal.

let activeModal = null;
let lastFocusedElement = null;
let activeOnClose = null;

function focusableIn(modal) {
  return Array.prototype.slice
    .call(
      modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )
    .filter((el) => el.offsetParent !== null);
}

export function openModal(backdropId, options) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop) return;
  if (activeModal && activeModal !== backdrop) {
    closeModal(activeModal, { skipReturnFocus: true });
  }
  lastFocusedElement = document.activeElement;
  activeOnClose = (options && options.onClose) || null;
  backdrop.hidden = false;
  activeModal = backdrop;
  document.body.style.overflow = 'hidden';
  const modal = backdrop.querySelector('.modal');
  const firstInput = modal.querySelector('input:not([type=hidden]), select');
  if (firstInput) {
    firstInput.focus();
  } else {
    const focusables = focusableIn(modal);
    if (focusables.length) focusables[0].focus();
  }
}

export function closeModal(backdrop, options) {
  const target = backdrop || activeModal;
  if (!target) return;
  const opts = options || {};
  target.hidden = true;
  if (activeModal === target) {
    activeModal = null;
  }
  document.body.style.overflow = '';
  const onClose = activeOnClose;
  activeOnClose = null;
  if (onClose) {
    try {
      onClose();
    } catch (err) {
      // Callback penutup tidak boleh merusak alur tutup modal.
      console.error(err);
    }
  }
  if (!opts.skipReturnFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

export function initModalInfra() {
  document.addEventListener('keydown', (e) => {
    if (!activeModal) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal(activeModal);
      return;
    }
    if (e.key !== 'Tab') return;
    const modal = activeModal.querySelector('.modal');
    const focusables = focusableIn(modal);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop);
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal-backdrop')));
  });
}

export function showFieldMessage(el, message) {
  el.textContent = message;
  el.hidden = false;
}

export function hideFieldMessage(el) {
  el.hidden = true;
  el.textContent = '';
}
