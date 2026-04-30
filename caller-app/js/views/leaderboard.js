function renderLeaderboard(container) {
  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Leaderboard</div>
    </div>
    <div id="week-selector" style="margin-top:1rem;display:flex;gap:0.5rem">
      <button class="btn btn-sm btn-primary week-btn active" data-week="current">This week</button>
      <button class="btn btn-sm btn-secondary week-btn" data-week="last">Last week</button>
    </div>
    <div id="leaderboard-list" style="margin-top:1rem">
      <div class="card"><div class="skeleton" style="height:56px"></div></div>
      <div class="card"><div class="skeleton" style="height:56px"></div></div>
      <div class="card"><div class="skeleton" style="height:56px"></div></div>
    </div>
  `;

  let currentWeek = 'current';

  loadLeaderboard();

  container.querySelectorAll('.week-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentWeek = btn.dataset.week;
      container.querySelectorAll('.week-btn').forEach((b) => {
        b.className = `btn btn-sm ${b.dataset.week === currentWeek ? 'btn-primary' : 'btn-secondary'} week-btn`;
      });
      loadLeaderboard();
    });
  });

  async function loadLeaderboard() {
    try {
      const data = await API.getLeaderboard();
      renderList(data);
    } catch {
      document.getElementById('leaderboard-list').innerHTML = `
        <div class="empty-state"><div class="empty-state-text">Failed to load leaderboard</div></div>
      `;
    }
  }

  function renderList(data) {
    const caller = Auth.getCaller();
    const callers = data?.callers || [];
    const week = currentWeek === 'current' ? 'this_week' : 'last_week';
    const el = document.getElementById('leaderboard-list');

    if (callers.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-text">No data yet</div></div>`;
      return;
    }

    const sorted = [...callers].sort((a, b) => (b[week]?.calls || 0) - (a[week]?.calls || 0));

    el.innerHTML = sorted.map((c, i) => {
      const stats = c[week] || {};
      const isMe = c.id === caller.id;
      return `
        <div class="card" style="${isMe ? 'border:2px solid var(--accent)' : ''}${i > 0 ? 'margin-top:0.5rem' : ''}">
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="width:32px;height:32px;border-radius:50%;background:${isMe ? 'var(--accent)' : 'var(--bg)'};color:${isMe ? 'white' : 'var(--text-sub)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-md)">${i + 1}</div>
            <div style="flex:1">
              <div style="font-size:var(--text-md);font-weight:600">${c.name} ${isMe ? '(You)' : ''}</div>
              <div style="font-size:var(--text-sm);color:var(--text-sub);display:flex;gap:1rem;margin-top:2px">
                <span>${stats.demos || 0} demos</span>
                ${c.streak > 0 ? `<span style="display:inline-flex;align-items:center;gap:2px"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--yellow)" stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>${c.streak}</span>` : ''}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:var(--text-xl);font-weight:700">${stats.calls || 0}</div>
              <div style="font-size:var(--text-xs);color:var(--text-sub)">calls</div>
            </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:var(--text-md);font-weight:600">$${(stats.potential_cad || 0).toLocaleString()}</div>
              <div style="font-size:var(--text-xs);color:var(--text-sub)">CAD</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}
