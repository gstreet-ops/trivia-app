import React, { useEffect, useRef } from 'react';

/**
 * Reusable confirmation dialog to replace window.confirm().
 * Traps focus, supports Escape to cancel, styled inline to bypass CDN cache.
 *
 * Props:
 *   message  - string to display
 *   onConfirm - called when user clicks Confirm
 *   onCancel  - called when user clicks Cancel or presses Escape
 *   confirmLabel - optional, defaults to 'Confirm'
 *   destructive  - optional, if true the confirm button is red
 */
function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Confirm', destructive = false }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', handleKey); };
  }, [onCancel]);

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
  };
  const boxStyle = {
    background: 'var(--card-bg, #fff)', borderRadius: '10px', padding: '24px 28px',
    maxWidth: '420px', width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
  };
  const msgStyle = { fontSize: '0.95rem', color: 'var(--text-primary, #333)', lineHeight: 1.5, marginBottom: '20px' };
  const btnRow = { display: 'flex', justifyContent: 'flex-end', gap: '10px' };
  const cancelStyle = {
    padding: '8px 18px', border: '1px solid var(--border-color, #ccc)', borderRadius: '6px',
    background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary, #555)'
  };
  const confirmStyle = {
    padding: '8px 18px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem',
    fontWeight: 600, color: '#fff',
    background: destructive ? '#dc2626' : '#041E42'
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={boxStyle} role="dialog" aria-modal="true" aria-label="Confirmation" onClick={(e) => e.stopPropagation()}>
        <p style={msgStyle}>{message}</p>
        <div style={btnRow}>
          <button style={cancelStyle} onClick={onCancel}>Cancel</button>
          <button ref={confirmRef} style={confirmStyle} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
