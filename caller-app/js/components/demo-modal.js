function showDemoModal(lead, onSubmit) {
  let overlay = document.getElementById('demo-modal');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'demo-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <div style="font-size:var(--text-lg);font-weight:600;margin-bottom:1.25rem">Great call! 🎯</div>
      <div class="input-group">
        <label>Client email address *</label>
        <input type="email" class="input-field" id="demo-email" placeholder="mike@mikesplumbing.com" autocomplete="email">
        <div class="input-error-text" id="demo-email-error" style="display:none"></div>
      </div>
      <div class="input-group">
        <label>Contact name</label>
        <input type="text" class="input-field" id="demo-name" placeholder="Mike" autocomplete="off">
      </div>
      <div class="input-group">
        <label>Notes for the team</label>
        <textarea class="input-field" id="demo-notes" rows="3" placeholder="He mentioned he's losing clients to a competitor who has a better website. Good urgency." style="resize:vertical"></textarea>
      </div>
      <button class="btn btn-full btn-primary" id="demo-submit" style="margin-top:0.5rem">Submit → Start Pipeline</button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  function close() {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  overlay.querySelector('#demo-submit').addEventListener('click', () => {
    const email = overlay.querySelector('#demo-email').value.trim();
    const name = overlay.querySelector('#demo-name').value.trim();
    const notes = overlay.querySelector('#demo-notes').value.trim();
    const errorEl = overlay.querySelector('#demo-email-error');
    const emailInput = overlay.querySelector('#demo-email');

    if (!email || !validateEmail(email)) {
      emailInput.classList.add('input-error');
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.style.display = 'block';
      return;
    }

    emailInput.classList.remove('input-error');
    errorEl.style.display = 'none';
    close();
    onSubmit({ email, name, notes, lead });
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function launchConfetti() {
  const colors = ['#2563EB', '#16A34A', '#D97706', '#1A1A1A', '#F9F9F9'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top = '-10px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1 + Math.random()) + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2500);
  }
}
