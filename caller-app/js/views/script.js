function renderScript(container) {
  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Script</div>
      <div class="page-subtitle">Follow this on every call</div>
    </div>

    <div style="margin-top:1.25rem">
      <div class="card anim-slide-up" style="border-left:4px solid var(--accent)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          <span style="font-weight:600;color:var(--accent)">OPENING</span>
        </div>
        <div class="script-line">
          "Bonjour est-ce que je suis bien chez <strong>[entreprise]</strong> ?"
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.05s;border-left:4px solid var(--accent)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style="font-weight:600;color:var(--accent)">INTRODUCE YOURSELF</span>
        </div>
        <div class="script-line">
          "Ok good parfait, Mon nom c'est <strong>[ton nom]</strong>, c'est moi qui s'occupe de faire les site web ici a <strong>[ville]</strong>,"
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.1s;border-left:4px solid var(--accent)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style="font-weight:600;color:var(--accent)">THE HOOK</span>
        </div>
        <div class="script-line">
          "J'vous appel parce que on vient de finir votre site web."
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.15s;border-left:4px solid var(--yellow)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-weight:600;color:var(--yellow)">IF THEY ASK "Mon site web?"</span>
        </div>
        <div class="script-line">
          "En fait, c'est une demo qu'on vous a fait totalement gratuitement, pour que vous puissiez voir de quoi ca a l'air. Puis evidemment si ca vous plait puis que vous voulez que l'on termine le site web, on va pouvoir vous aider avec ca."
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.2s;border-left:4px solid var(--green)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span style="font-weight:600;color:var(--green)">THE ASK — Get their email</span>
        </div>
        <div class="script-line">
          "Mais ouais, est-ce ca vous derange si je vous l'envoie votre demo par courriel ?"
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.25s;border-left:4px solid var(--green);background:var(--green-light)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span style="font-weight:600;color:var(--green)">GET THEIR NAME — End of call</span>
        </div>
        <div class="script-line" style="font-size:var(--text-base)">
          "Au fait, quel nom je devrais mettre dans le courriel ?"
        </div>
        <div style="margin-top:0.75rem;padding:0.75rem;background:var(--surface);border-radius:var(--radius-btn);font-size:var(--text-sm);color:var(--text-sub)">
          This is where you get both the <strong style="color:var(--green)">email address</strong> and the <strong style="color:var(--green)">contact name</strong> you'll need to fill in the Demo Agreed form.
        </div>
      </div>
    </div>
  `;
}
