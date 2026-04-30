function renderProfile(container) {
  const caller = Auth.getCaller();

  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Profile</div>
    </div>

    <div id="profile-content" style="margin-top:1.25rem">
      <div class="card" style="text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:var(--text-xl);font-weight:700;margin:0 auto">${caller.name.charAt(0)}</div>
        <div style="font-size:var(--text-lg);font-weight:600;margin-top:0.75rem">${caller.name}</div>
        <span class="badge badge-accent" style="margin-top:0.25rem">${caller.role}</span>
      </div>

      <div class="card" id="profile-streaks">
        <div class="section-header">Streak</div>
        <div style="display:flex;gap:1.5rem">
          <div>
            <div class="stat-value" id="profile-current-streak">—</div>
            <div class="stat-label">Current</div>
          </div>
          <div>
            <div class="stat-value" id="profile-longest-streak">—</div>
            <div class="stat-label">Longest</div>
          </div>
        </div>
      </div>

      <div class="card" id="profile-alltime">
        <div class="section-header">All-time Stats</div>
        <div style="display:flex;gap:1.5rem">
          <div>
            <div class="stat-value" id="profile-total-calls">—</div>
            <div class="stat-label">Total Calls</div>
          </div>
          <div>
            <div class="stat-value" id="profile-total-demos">—</div>
            <div class="stat-label">Total Demos</div>
          </div>
          <div>
            <div class="stat-value" id="profile-total-earned">—</div>
            <div class="stat-label">Total Earned</div>
          </div>
        </div>
      </div>

      <div style="margin-top:2rem">
        <button class="btn btn-full btn-danger" id="logout-btn" style="font-weight:500">Log out</button>
      </div>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
  });

  loadProfile();

  async function loadProfile() {
    try {
      const [streaks, me] = await Promise.all([API.getMyStreaks(), API.getMe()]);
      document.getElementById('profile-current-streak').textContent = streaks?.current_streak || 0;
      document.getElementById('profile-longest-streak').textContent = streaks?.longest_streak || 0;
      document.getElementById('profile-total-calls').textContent = me?.total_calls || 0;
      document.getElementById('profile-total-demos').textContent = me?.total_demos || 0;
      document.getElementById('profile-total-earned').textContent = `$${(me?.total_earned || 0).toLocaleString()}`;
    } catch {
      // keep dashes
    }
  }
}
