function renderLeadCard(lead, onTap) {
  const statusMap = {
    unassigned: { label: 'New', cls: 'badge-accent' },
    assigned: { label: 'Assigned', cls: 'badge-gray' },
    called: { label: 'Called', cls: 'badge-gray' },
    no_answer: { label: 'No Answer', cls: 'badge-yellow' },
    not_interested: { label: 'Not Interested', cls: 'badge-red' },
    callback: { label: 'Callback', cls: 'badge-yellow' },
    demo_agreed: { label: 'Demo Agreed', cls: 'badge-green' },
    closed: { label: 'Closed', cls: 'badge-green' },
  };

  const s = statusMap[lead.status] || statusMap.unassigned;
  const card = document.createElement('div');
  card.className = 'card lead-card';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:0.35rem">
          <div style="font-size:var(--text-md);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lead.business_name}</div>
          ${lead.is_test ? '<span class="pill" style="background:var(--purple-light);color:var(--purple);font-size:9px;font-weight:700;letter-spacing:0.3px;flex-shrink:0">TEST</span>' : ''}
        </div>
        <div style="font-size:var(--text-sm);color:var(--text-sub);margin-top:2px">${[lead.city, lead.state].filter(Boolean).join(', ')}</div>
        ${lead.category ? `<span class="pill" style="margin-top:6px;background:var(--bg);color:var(--text-sub)">${lead.category}</span>` : ''}
      </div>
      <span class="badge ${s.cls}">${s.label}</span>
    </div>
  `;
  if (onTap) card.addEventListener('click', () => onTap(lead));
  return card;
}
