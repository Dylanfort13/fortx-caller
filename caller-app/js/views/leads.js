function renderLeads(container) {
  let leads = [];
  let currentLead = null;

  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Leads</div>
      <div class="page-subtitle" id="leads-count"></div>
    </div>
    <div id="leads-list" style="margin-top:1rem">
      <div class="card"><div class="skeleton" style="height:60px"></div></div>
      <div class="card"><div class="skeleton" style="height:60px"></div></div>
      <div class="card"><div class="skeleton" style="height:60px"></div></div>
    </div>
  `;

  loadLeads();

  async function loadLeads() {
    try {
      leads = await API.getCurrentLeads();
      renderList();
    } catch {
      document.getElementById('leads-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">Failed to load leads</div>
        </div>
      `;
    }
  }

  function renderList() {
    const el = document.getElementById('leads-list');
    const countEl = document.getElementById('leads-count');

    if (!leads || leads.length === 0) {
      countEl.textContent = 'No leads assigned';
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="empty-state-text">No leads yet. Request a batch from the Home tab.</div>
        </div>
      `;
      return;
    }

    const uncalled = leads.filter(l => !['demo_agreed', 'closed'].includes(l.status)).length;
    countEl.textContent = `${leads.length} leads — ${uncalled} remaining`;

    el.innerHTML = '';
    leads.forEach((lead) => {
      const card = renderLeadCard(lead, onLeadTap);
      el.appendChild(card);
    });
  }

  function onLeadTap(lead) {
    if (lead.status === 'demo_agreed' || lead.status === 'closed') {
      Toast.show('This lead is already in the pipeline', 'success');
      return;
    }
    currentLead = lead;
    showOutcomeModal(lead, handleOutcome);
  }

  async function handleOutcome(outcome, lead) {
    if (outcome === 'demo_agreed') {
      showDemoModal(lead, handleDemoSubmit);
      return;
    }

    try {
      await API.logCall({
        lead_id: lead.id,
        outcome: outcome,
      });
      lead.status = outcome === 'no_answer' ? 'no_answer' : 'not_interested';
      renderList();
      Toast.show('Call logged', 'success');
    } catch {
      Toast.show('Failed to log call', 'error');
    }
  }

  async function handleDemoSubmit({ email, name, notes, lead }) {
    try {
      await API.demoAgreed({
        lead_id: lead.id,
        prospect_email: email,
        prospect_name: name,
        notes: notes,
      });
      lead.status = 'demo_agreed';
      renderList();
      launchConfetti();
      Toast.show('Pipeline started! FortX Web team is on it.', 'success');
    } catch {
      Toast.show('Failed to start pipeline', 'error');
    }
  }
}
