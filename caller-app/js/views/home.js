function renderHome(container) {
  const caller = Auth.getCaller();

  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title" id="home-greeting">Good morning, ${caller.name}.</div>
      <div class="page-subtitle" id="home-date"></div>
    </div>

    <div id="home-stats" style="margin-top:1.25rem"></div>

    <div id="home-pace" style="margin-top:1rem"></div>
    <div id="home-leads-banner" style="margin-top:1rem"></div>
    <div id="home-goal" style="margin-top:1.25rem"></div>
  `;

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function formatDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  container.querySelector('#home-greeting').textContent = `${getGreeting()}, ${caller.name}.`;
  container.querySelector('#home-date').textContent = formatDate();

  Promise.all([API.getMe(), API.getTodayGoal(), API.getMyStreaks(), API.getMyCommissions(), API.getCurrentLeads()])
    .then(([me, goal, streaks, commissions, leads]) => {
      renderStats(me, goal, streaks, commissions);
      renderPace(me, commissions);
      renderLeadsBanner(leads);
      renderGoal(goal);
    })
    .catch(() => Toast.show('Failed to load stats', 'error'));

  function renderStats(me, goal, streaks, commissions) {
    const callsToday = goal?.calls_made || 0;
    const targetCalls = goal?.target_calls || 30;
    const potentialTotal = (commissions?.potential || []).reduce((s, c) => s + Number(c.amount_cad), 0);
    const pendingTotal = (commissions?.pending_payout || []).reduce((s, c) => s + Number(c.amount_cad), 0);

    document.getElementById('home-stats').innerHTML = `
      <div class="card">
        <div class="stat-label">Calls Today</div>
        <div class="stat-value">${callsToday}</div>
        <div class="progress-bar" style="margin-top:0.5rem">
          <div class="progress-bar-fill green" style="width:${Math.min(100, (callsToday / targetCalls) * 100)}%"></div>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-sub);margin-top:0.25rem">${targetCalls} goal</div>
      </div>

      <div class="card">
        <div class="stat-label">Streak</div>
        <div class="stat-value">🔥 ${streaks?.current_streak || 0} days</div>
        <div style="font-size:var(--text-xs);color:var(--text-sub);margin-top:2px">Longest: ${streaks?.longest_streak || 0} days</div>
      </div>

      <div class="card">
        <div class="stat-label">Potential Earnings</div>
        <div class="stat-value">$${potentialTotal.toLocaleString()} CAD</div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;gap:0.25rem">
          <div class="stat-label">Pending Payout</div>
          <span class="info-tip" title="Demo sent — FortX team is closing this client">i</span>
        </div>
        <div class="stat-value">$${pendingTotal.toLocaleString()} CAD</div>
      </div>
    `;
  }

  function renderPace(me, commissions) {
    const allCommissions = [...(commissions?.potential || []), ...(commissions?.pending_payout || [])];
    const totalDemos = allCommissions.length;
    const daysActive = Math.max(1, Math.ceil((Date.now() - new Date(me?.created_at || Date.now()).getTime()) / 86400000));
    const demoRate = totalDemos / daysActive;
    const monthlyProjection = Math.round(demoRate * 30 * 260);

    if (totalDemos === 0) return;
    document.getElementById('home-pace').innerHTML = `
      <div style="padding:0.75rem 1rem;background:var(--accent-light);border-radius:var(--radius-btn);font-size:var(--text-sm);color:var(--accent);font-weight:500">
        At your pace → ~$${monthlyProjection.toLocaleString()} this month
      </div>
    `;
  }

  function renderLeadsBanner(leads) {
    const remaining = leads?.length || 0;
    const el = document.getElementById('home-leads-banner');

    if (remaining === 0) {
      el.innerHTML = `
        <div class="card" style="text-align:center;border:2px solid var(--accent)">
          <div style="font-size:var(--text-lg);font-weight:600;margin-bottom:0.5rem">No leads left!</div>
          <button class="btn btn-primary btn-full" id="request-leads-btn">Request your next 30 leads</button>
        </div>
      `;
      el.querySelector('#request-leads-btn').addEventListener('click', requestLeads);
    } else if (remaining <= 5) {
      el.innerHTML = `
        <div style="padding:0.75rem 1rem;background:var(--yellow-light);border-radius:var(--radius-btn);font-size:var(--text-sm);color:var(--yellow);font-weight:500;display:flex;justify-content:space-between;align-items:center">
          <span>Almost done! ${remaining} leads remaining</span>
          <button class="btn btn-sm btn-primary" id="request-leads-btn" style="font-size:var(--text-xs)">Get more</button>
        </div>
      `;
      el.querySelector('#request-leads-btn').addEventListener('click', requestLeads);
    } else {
      el.innerHTML = `
        <div style="display:inline-flex">
          <span class="badge badge-green">${remaining} leads remaining</span>
        </div>
      `;
    }
  }

  async function requestLeads() {
    try {
      await API.requestMoreLeads();
      Toast.show('Kiter is assigning your next batch. Check back in ~2 minutes.', 'success');
    } catch {
      Toast.show('Failed to request leads', 'error');
    }
  }

  function renderGoal(goal) {
    const calls = goal?.calls_made || 0;
    const target = goal?.target_calls || 30;
    const pct = Math.min(100, (calls / target) * 100);
    const circumference = 2 * Math.PI * 46;
    const offset = circumference - (pct / 100) * circumference;

    document.getElementById('home-goal').innerHTML = `
      <div class="card" style="text-align:center">
        <div style="position:relative;width:120px;height:120px;margin:0 auto">
          <svg width="120" height="120" style="transform:rotate(-90deg)">
            <circle cx="60" cy="60" r="46" fill="none" stroke="var(--bg)" stroke-width="8"/>
            <circle cx="60" cy="60" r="46" fill="none" stroke="var(--accent)" stroke-width="8"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              stroke-linecap="round" style="transition:stroke-dashoffset 0.6s ease"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <span style="font-size:var(--text-lg);font-weight:700">${calls}</span>
            <span style="font-size:var(--text-xs);color:var(--text-sub)">/ ${target} calls</span>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" style="margin-top:0.75rem" id="set-goal-btn">
          ${goal ? 'Edit goal' : 'Set today\'s goal'}
        </button>
      </div>
    `;

    document.getElementById('set-goal-btn').addEventListener('click', showGoalPicker);
  }

  function showGoalPicker() {
    let overlay = document.getElementById('goal-picker-modal');
    if (overlay) overlay.remove();

    const presets = [10, 20, 30, 40, 50];
    overlay = document.createElement('div');
    overlay.id = 'goal-picker-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <div style="font-size:var(--text-lg);font-weight:600;margin-bottom:1rem">Set today's goal</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem">
          ${presets.map(n => `<button class="btn btn-secondary goal-preset" data-val="${n}">${n}</button>`).join('')}
        </div>
        <div class="input-group">
          <label>Or enter custom</label>
          <input type="number" class="input-field" id="custom-goal" placeholder="30" min="1" max="200">
        </div>
        <button class="btn btn-full btn-primary" id="save-goal-btn">Save</button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    function close() {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }

    overlay.querySelectorAll('.goal-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        overlay.querySelector('#custom-goal').value = btn.dataset.val;
      });
    });

    overlay.querySelector('#save-goal-btn').addEventListener('click', async () => {
      const val = parseInt(overlay.querySelector('#custom-goal').value) || 30;
      try {
        await API.setGoal(val);
        Toast.show('Goal set!', 'success');
        close();
        Router.navigate();
      } catch {
        Toast.show('Failed to set goal', 'error');
      }
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }
}
