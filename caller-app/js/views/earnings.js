function renderEarnings(container) {
  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Earnings</div>
    </div>
    <div id="earnings-content" style="margin-top:1rem">
      <div class="empty-state"><div class="empty-state-text">Loading...</div></div>
    </div>
  `;

  loadEarnings();

  async function loadEarnings() {
    try {
      const data = await API.getMyCommissions();
      renderContent(data);
    } catch {
      document.getElementById('earnings-content').innerHTML = `
        <div class="empty-state"><div class="empty-state-text">Failed to load earnings</div></div>
      `;
    }
  }

  function renderContent(data) {
    const potential = data?.potential || [];
    const pending = data?.pending_payout || [];
    const paid = data?.paid || [];

    const potentialTotal = potential.reduce((s, c) => s + Number(c.amount_cad), 0);
    const pendingTotal = pending.reduce((s, c) => s + Number(c.amount_cad), 0);
    const paidTotal = paid.reduce((s, c) => s + Number(c.amount_cad), 0);

    const el = document.getElementById('earnings-content');
    el.innerHTML = `
      <div class="card" style="border-left:4px solid var(--yellow)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
          <span class="section-header" style="margin:0">Potential</span>
          <span style="font-size:var(--text-lg);font-weight:700">$${potentialTotal.toLocaleString()} CAD</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-sub);margin-bottom:0.75rem">
          Pending demo closes <span class="info-tip" title="Demo sent — FortX is currently working on closing this client">i</span>
        </div>
        ${renderCommissionList(potential)}
        ${potential.length === 0 ? '<div style="font-size:var(--text-sm);color:var(--text-sub);text-align:center;padding:1rem">No potential commissions yet</div>' : ''}
      </div>

      <div class="card" style="border-left:4px solid var(--green);margin-top:0.75rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
          <span class="section-header" style="margin:0">Pending Payout</span>
          <span style="font-size:var(--text-lg);font-weight:700">$${pendingTotal.toLocaleString()} CAD</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-sub);margin-bottom:0.75rem">
          Client signed — awaiting payment <span class="info-tip" title="Client signed — awaiting payment processing">i</span>
        </div>
        ${renderCommissionList(pending)}
        ${pending.length === 0 ? '<div style="font-size:var(--text-sm);color:var(--text-sub);text-align:center;padding:1rem">No pending payouts</div>' : ''}
      </div>

      <div style="margin-top:0.75rem">
        <button class="btn btn-full btn-secondary" id="toggle-paid" style="display:${paid.length > 0 ? 'flex' : 'none'}">
          Show paid history (${paid.length})
        </button>
        <div id="paid-section" style="display:none;margin-top:0.75rem">
          <div class="card" style="border-left:4px solid var(--text-sub)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
              <span class="section-header" style="margin:0">Paid</span>
              <span style="font-size:var(--text-lg);font-weight:700">$${paidTotal.toLocaleString()} CAD</span>
            </div>
            ${renderCommissionList(paid)}
          </div>
        </div>
      </div>
    `;

    const toggleBtn = el.querySelector('#toggle-paid');
    const paidSection = el.querySelector('#paid-section');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const visible = paidSection.style.display !== 'none';
        paidSection.style.display = visible ? 'none' : 'block';
        toggleBtn.textContent = visible ? `Show paid history (${paid.length})` : 'Hide paid history';
      });
    }
  }

  function renderCommissionList(items) {
    return items.map((c) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-top:1px solid var(--border)">
        <div>
          <div style="font-size:var(--text-base);font-weight:500">${c.business_name || 'Unknown'}</div>
          <div style="font-size:var(--text-xs);color:var(--text-sub)">${c.city || ''} · ${new Date(c.created_at).toLocaleDateString()}</div>
        </div>
        <span style="font-size:var(--text-base);font-weight:600">+$${Number(c.amount_cad).toLocaleString()} CAD</span>
      </div>
    `).join('');
  }
}
