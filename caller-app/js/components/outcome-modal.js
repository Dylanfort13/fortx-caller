function showOutcomeModal(lead, onOutcome) {
  let overlay = document.getElementById('outcome-modal');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'outcome-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <div style="font-size:var(--text-lg);font-weight:600;margin-bottom:0.25rem">${lead.business_name}</div>
      <div style="font-size:var(--text-sm);color:var(--text-sub);margin-bottom:1.5rem">${[lead.city, lead.state].filter(Boolean).join(', ')}</div>
      ${lead.phone ? `<a href="tel:${lead.phone}" style="display:block;font-size:var(--text-xl);font-weight:600;color:var(--accent);margin-bottom:1rem">${lead.phone}</a>` : ''}
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        <button class="btn btn-full" style="background:var(--bg);color:var(--text-sub)" data-outcome="no_answer">
          No Answer
        </button>
        <button class="btn btn-full btn-danger" data-outcome="not_interested">
          Not Interested
        </button>
        <button class="btn btn-full btn-primary" data-outcome="demo_agreed">
          Demo Agreed
        </button>
      </div>
      <button class="btn btn-full btn-secondary" style="margin-top:0.75rem" id="outcome-cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  function close() {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }

  overlay.querySelectorAll('[data-outcome]').forEach((btn) => {
    btn.addEventListener('click', () => {
      close();
      onOutcome(btn.dataset.outcome, lead);
    });
  });
  overlay.querySelector('#outcome-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
