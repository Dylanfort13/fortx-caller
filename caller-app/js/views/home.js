function renderHome(container) {
  const caller = Auth.getCaller();
  let leads = [];
  let todayPotential = 0;

  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title" id="home-greeting">Good morning, ${caller.name}.</div>
      <div class="page-subtitle" id="home-date"></div>
    </div>
    <div id="home-stats" style="margin-top:1.25rem"></div>
    <div id="home-potential" style="margin-top:0.75rem"></div>
    <div id="home-next-call" style="margin-top:1.25rem"></div>
  `;

  container.querySelector('#home-greeting').textContent = `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, ${caller.name}.`;
  container.querySelector('#home-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  showSkeletons();

  Promise.all([API.getMe(), API.getTodayGoal(), API.getMyStreaks(), API.getMyCommissions(), API.getCurrentLeads()])
    .then(([me, goal, streaks, commissions, leadsData]) => {
      leads = leadsData || [];
      renderStats(me, goal, streaks, commissions);
      renderNextCall();
    })
    .catch(() => Toast.show('Failed to load stats', 'error'));

  function showSkeletons() {
    document.getElementById('home-stats').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="card"><div class="skeleton" style="height:80px"></div></div>
        <div class="card"><div class="skeleton" style="height:80px"></div></div>
      </div>`;
    document.getElementById('home-potential').innerHTML = `<div class="card"><div class="skeleton" style="height:48px"></div></div>`;
    document.getElementById('home-next-call').innerHTML = `<div class="card"><div class="skeleton" style="height:120px"></div></div>`;
  }

  function renderStats(me, goal, streaks, commissions) {
    const callsToday = goal?.calls_made || 0;
    const targetCalls = goal?.target_calls || 30;
    const potentialTotal = (commissions?.potential || []).reduce((s, c) => s + Number(c.amount_cad), 0);
    todayPotential = potentialTotal;

    document.getElementById('home-stats').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="card stat-box anim-slide-up">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            <span class="stat-label" style="margin:0">Calls Today</span>
          </div>
          <div class="stat-value">${callsToday}</div>
          <div class="progress-bar" style="margin-top:0.5rem">
            <div class="progress-bar-fill green" style="width:${Math.min(100, (callsToday / targetCalls) * 100)}%"></div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--text-sub);margin-top:0.25rem">${targetCalls} goal</div>
        </div>
        <div class="card stat-box anim-slide-up" style="animation-delay:0.05s">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span class="stat-label" style="margin:0">Streak</span>
          </div>
          <div class="stat-value">${streaks?.current_streak || 0} <span style="font-size:var(--text-sm);font-weight:500;color:var(--text-sub)">days</span></div>
          <div style="margin-top:0.5rem;height:6px"></div>
          <div style="font-size:var(--text-xs);color:var(--text-sub);margin-top:0.25rem">Longest: ${streaks?.longest_streak || 0} days</div>
        </div>
      </div>`;

    document.getElementById('home-potential').innerHTML = `
      <div class="card anim-slide-up" style="animation-delay:0.1s">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span style="font-size:var(--text-sm);color:var(--text-sub)">Today's Potential Earnings</span>
          </div>
          <span style="font-size:var(--text-lg);font-weight:700;color:var(--green)" id="potential-amount">$${todayPotential.toLocaleString()} CAD</span>
        </div>
      </div>`;
  }

  function renderNextCall() {
    const remaining = leads.filter(l => l.status === 'assigned' || l.status === 'no_answer' || l.status === 'callback');
    const el = document.getElementById('home-next-call');

    if (remaining.length === 0) {
      el.innerHTML = `
        <div class="card anim-slide-up" style="text-align:center;animation-delay:0.15s">
          <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.75rem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span style="font-size:var(--text-md);font-weight:600">No leads left</span>
          </div>
          <p style="font-size:var(--text-sm);color:var(--text-sub);margin-bottom:1rem">Request your next batch to keep calling</p>
          <button class="btn btn-primary btn-full" id="request-leads-btn">Request 30 new leads</button>
        </div>`;
      el.querySelector('#request-leads-btn').addEventListener('click', requestLeads);
      return;
    }

    const lead = remaining[0];
    el.innerHTML = `
      <div class="card anim-slide-up" style="animation-delay:0.15s" id="next-call-card">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
          <span class="live-dot"></span>
          <span style="font-size:var(--text-sm);font-weight:600;color:var(--accent)">NEXT CALL</span>
          <span style="font-size:var(--text-xs);color:var(--text-sub);margin-left:auto">${remaining.length} remaining</span>
        </div>
        <div style="font-size:var(--text-lg);font-weight:600;display:flex;align-items:center;gap:0.35rem">${lead.business_name}${lead.is_test ? '<span class="pill" style="background:var(--purple-light);color:var(--purple);font-size:9px;font-weight:700;letter-spacing:0.3px;flex-shrink:0">TEST</span>' : ''}</div>
        <div style="font-size:var(--text-sm);color:var(--text-sub);margin-top:2px">${[lead.city, lead.state].filter(Boolean).join(', ')}</div>
        ${lead.category ? `<span class="pill" style="margin-top:6px;background:var(--accent-light);color:var(--accent)">${lead.category}</span>` : ''}
        <div style="margin-top:1rem">
          <a href="tel:${lead.phone}" class="call-btn-glow" id="call-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            Call ${lead.phone}
          </a>
        </div>
        <div id="outcome-section" style="margin-top:1rem;display:none;overflow:hidden;max-height:0;transition:max-height 0.3s ease,opacity 0.3s ease;opacity:0">
          <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:0.5rem">What happened?</div>
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            <button class="btn btn-full outcome-btn" style="background:var(--yellow-light);color:var(--yellow);font-weight:600" data-outcome="no_answer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              No Answer
            </button>
            <button class="btn btn-full outcome-btn" style="background:var(--red-light);color:var(--red);font-weight:600" data-outcome="not_interested">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Not Interested
            </button>
            <button class="btn btn-full outcome-btn" style="background:var(--green-light);color:var(--green);font-weight:600" data-outcome="demo_agreed" id="demo-agreed-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Demo Agreed!
            </button>
          </div>
        </div>
        <div id="demo-expand" style="margin-top:1rem;display:none;overflow:hidden;max-height:0;transition:max-height 0.3s ease,opacity 0.3s ease;opacity:0">
          <div style="font-size:var(--text-md);font-weight:600;margin-bottom:1rem;color:var(--green)">Great call!</div>
          <div class="input-group">
            <label>Client email address *</label>
            <input type="email" class="input-field" id="home-demo-email" placeholder="mike@mikesplumbing.com" autocomplete="email">
            <div class="input-error-text" id="home-demo-email-error" style="display:none"></div>
          </div>
          <div class="input-group">
            <label>Contact name</label>
            <input type="text" class="input-field" id="home-demo-name" placeholder="Mike">
          </div>
          <div class="input-group">
            <label>Notes for the team</label>
            <textarea class="input-field" id="home-demo-notes" rows="2" placeholder="Any details from the call..." style="resize:vertical"></textarea>
          </div>
          <button class="btn btn-primary btn-full" id="home-demo-submit">Submit & Start Pipeline</button>
        </div>
      </div>`;

    const callBtn = el.querySelector('#call-btn');
    const outcomeSection = el.querySelector('#outcome-section');
    const demoExpand = el.querySelector('#demo-expand');

    function expandSection(section) {
      section.style.display = 'block';
      requestAnimationFrame(() => {
        section.style.maxHeight = '400px';
        section.style.opacity = '1';
      });
    }

    function collapseSection(section) {
      section.style.maxHeight = '0';
      section.style.opacity = '0';
      setTimeout(() => { section.style.display = 'none'; }, 300);
    }

    callBtn.addEventListener('click', () => {
      setTimeout(() => expandSection(outcomeSection), 500);
    });

    el.querySelectorAll('.outcome-btn:not(#demo-agreed-btn)').forEach(btn => {
      btn.addEventListener('click', () => handleOutcome(btn.dataset.outcome, lead));
    });

    el.querySelector('#demo-agreed-btn').addEventListener('click', () => {
      collapseSection(outcomeSection);
      setTimeout(() => expandSection(demoExpand), 300);
      setTimeout(() => el.querySelector('#home-demo-email').focus(), 600);
    });

    el.querySelector('#home-demo-submit').addEventListener('click', () => handleDemoSubmit(lead));
  }

  async function handleOutcome(outcome, lead) {
    try {
      await API.logCall({ lead_id: lead.id, outcome });
      Toast.show(outcome === 'no_answer' ? 'No answer logged' : 'Not interested logged', 'success');
      animateTransition();
    } catch {
      Toast.show('Failed to log call', 'error');
    }
  }

  async function handleDemoSubmit(lead) {
    const email = document.getElementById('home-demo-email').value.trim();
    const name = document.getElementById('home-demo-name').value.trim();
    const notes = document.getElementById('home-demo-notes').value.trim();
    const errorEl = document.getElementById('home-demo-email-error');
    const emailInput = document.getElementById('home-demo-email');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.classList.add('input-error');
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.style.display = 'block';
      return;
    }

    try {
      await API.demoAgreed({ lead_id: lead.id, prospect_email: email, prospect_name: name, notes });
      launchConfetti();
      animatePotentialIncrease(260);
      Toast.show('Pipeline started! FortX Web team is on it.', 'success');
      animateTransition();
    } catch {
      Toast.show('Failed to start pipeline', 'error');
    }
  }

  function animatePotentialIncrease(amount) {
    todayPotential += amount;
    const el = document.getElementById('potential-amount');
    if (!el) return;
    el.style.transition = 'transform 0.3s ease, color 0.3s ease';
    el.style.transform = 'scale(1.2)';
    el.style.color = '#16A34A';
    setTimeout(() => { el.textContent = `$${todayPotential.toLocaleString()} CAD`; el.style.transform = 'scale(1)'; }, 300);
    setTimeout(() => { el.style.color = ''; }, 1000);
  }

  function animateTransition() {
    const card = document.getElementById('next-call-card');
    const outcome = document.getElementById('outcome-section');
    const demoExpand = document.getElementById('demo-expand');
    if (card) { card.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; card.style.opacity = '0'; card.style.transform = 'translateX(-30px)'; }
    if (outcome) outcome.style.display = 'none';
    if (demoExpand) demoExpand.style.display = 'none';
    setTimeout(() => { leads.shift(); renderNextCall(); }, 350);
  }

  async function requestLeads() {
    try {
      await API.requestMoreLeads();
      Toast.show('FortX Web team is assigning your next batch. Check back in ~2 minutes.', 'success');
    } catch {
      Toast.show('Failed to request leads', 'error');
    }
  }
}
