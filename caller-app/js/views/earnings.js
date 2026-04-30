function renderEarnings(container) {
  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Earnings</div>
    </div>
    <div id="earnings-content" style="margin-top:1rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="card"><div class="skeleton" style="height:80px"></div></div>
        <div class="card"><div class="skeleton" style="height:80px"></div></div>
      </div>
      <div class="card" style="margin-top:0.75rem"><div class="skeleton" style="height:160px"></div></div>
      <div class="card" style="margin-top:0.75rem"><div class="skeleton" style="height:48px"></div></div>
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

    const weekData = getWeekData(potential, pending, paid);
    const maxVal = Math.max(...weekData.map(d => d.total), 1);

    const el = document.getElementById('earnings-content');
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;align-items:stretch">
        <div class="card anim-slide-up" style="border-top:3px solid var(--green)">
          <div style="font-size:var(--text-xs);color:var(--text-sub);margin-bottom:0.5rem">Daily Potential</div>
          <div style="font-size:var(--text-xl);font-weight:700;color:var(--green)">$${potentialTotal.toLocaleString()}</div>
          <div style="font-size:var(--text-xs);color:var(--text-sub);margin-top:0.25rem">CAD</div>
        </div>
        <div class="card anim-slide-up" style="animation-delay:0.05s;border-top:3px solid var(--yellow)">
          <div style="font-size:var(--text-xs);color:var(--text-sub);margin-bottom:0.5rem">Upcoming Payout</div>
          <div style="font-size:var(--text-xl);font-weight:700;color:var(--yellow)">$${pendingTotal.toLocaleString()}</div>
          <div style="font-size:var(--text-xs);color:var(--text-sub);margin-top:0.25rem">CAD</div>
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.1s;margin-top:0.75rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <span style="font-size:var(--text-sm);font-weight:600">Weekly Performance</span>
          <span style="font-size:var(--text-xs);color:var(--text-sub)">Last 7 days</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:100px">
          ${weekData.map(d => {
            const h = Math.max(4, (d.total / maxVal) * 80);
            const barColor = d.total > 0 ? 'var(--accent)' : 'var(--border)';
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="font-size:9px;color:var(--text-sub)">${d.total > 0 ? '$' + d.total : ''}</div>
              <div style="width:100%;height:${h}px;background:${barColor};border-radius:4px;transition:height 0.3s ease"></div>
              <div style="font-size:9px;color:var(--text-sub)">${d.day}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.15s;margin-top:0.75rem">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:var(--text-sm);font-weight:600">Total Paid Out</span>
          <span style="font-size:var(--text-lg);font-weight:700">$${paidTotal.toLocaleString()} CAD</span>
        </div>
      </div>

      ${potential.length > 0 ? `
      <div style="margin-top:1rem">
        <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:0.5rem">Potential Commissions</div>
        ${renderCommissionList(potential)}
      </div>` : ''}

      ${pending.length > 0 ? `
      <div style="margin-top:1rem">
        <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:0.5rem">Pending Payouts</div>
        ${renderCommissionList(pending)}
      </div>` : ''}

      <div style="margin-top:0.75rem">
        <button class="btn btn-full btn-secondary" id="toggle-paid" style="display:${paid.length > 0 ? 'flex' : 'none'}">
          Show paid history (${paid.length})
        </button>
        <div id="paid-section" style="display:none;margin-top:0.75rem">
          <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:0.5rem">Paid</div>
          ${renderCommissionList(paid)}
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

  function getWeekData(potential, pending, paid) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayName = days[d.getDay()];
      const total = [...potential, ...pending, ...paid]
        .filter(c => (c.created_at || '').slice(0, 10) === dayStr)
        .reduce((s, c) => s + Number(c.amount_cad), 0);
      result.push({ day: dayName, total });
    }
    return result;
  }

  function renderCommissionList(items) {
    return items.map((c, i) => `
      <div class="card anim-slide-up" style="animation-delay:${0.2 + i * 0.03}s;flex-direction:row;justify-content:space-between;align-items:center;padding:0.875rem">
        <div style="min-width:0;flex:1">
          <div style="font-size:var(--text-sm);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.business_name || 'Unknown'}</div>
          <div style="font-size:var(--text-xs);color:var(--text-sub)">${c.city || ''} · ${new Date(c.created_at).toLocaleDateString()}</div>
        </div>
        <span style="font-size:var(--text-sm);font-weight:600;flex-shrink:0;margin-left:0.75rem">+$${Number(c.amount_cad).toLocaleString()}</span>
      </div>
    `).join('');
  }
}
