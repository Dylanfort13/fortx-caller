function renderScript(container) {
  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Script</div>
      <div class="page-subtitle">Follow this on every call</div>
    </div>

    <div style="margin-top:1.25rem">
      <div class="card anim-slide-up" style="border-left:4px solid var(--accent)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          <span style="font-weight:600;color:var(--accent)">STEP 1 — Opening</span>
        </div>
        <div class="script-line">"Hi, am I speaking with <strong>[business name]</strong>?"</div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.05s;border-left:4px solid var(--accent)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style="font-weight:600;color:var(--accent)">STEP 2 — Introduce yourself</span>
        </div>
        <div class="script-line">"Great! My name is <strong>[your name]</strong>, I handle the websites here in <strong>[city]</strong>."</div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.1s;border-left:4px solid var(--accent)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style="font-weight:600;color:var(--accent)">STEP 3 — The Hook</span>
        </div>
        <div class="script-line">"The reason why I'm calling today is because we just <strong style="color:var(--yellow)">[speak slower, word by word]</strong> finished building your website."</div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.15s;border-left:4px solid var(--yellow)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-weight:600;color:var(--yellow)">If they say "My website?" (or if they have doubt)</span>
        </div>
        <div class="script-line">"Well, it's a <strong>DEMO</strong> we built completely for free, so you can see what it would look like. Obviously if you like it and want us to finalize it, we can help with that."</div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.2s;border-left:4px solid var(--green)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span style="font-weight:600;color:var(--green)">STEP 4 — Get their email</span>
        </div>
        <div class="script-line">"Do you mind if I send you the demo by email?"</div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.25s;border-left:4px solid var(--green);background:var(--green-light)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span style="font-weight:600;color:var(--green)">STEP 5 — Get their name</span>
        </div>
        <div class="script-line">"By the way, what name should I put in the email?"</div>
        <div style="margin-top:0.75rem;padding:0.75rem;background:var(--surface);border-radius:var(--radius-btn);font-size:var(--text-sm);color:var(--text-sub)">
          This is where you get both the <strong style="color:var(--green)">email address</strong> and the <strong style="color:var(--green)">contact name</strong> you need to fill in the Demo Agreed form.
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.3s;border-left:4px solid var(--accent);background:var(--accent-light)">
        <div class="script-step">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span style="font-weight:600;color:var(--accent)">STEP 6 — Close</span>
        </div>
        <div class="script-line">"Alright <strong>[prospect name]</strong>, you should receive the demo within a few hours — my team just needs a bit of time to put it online. I'll send it to the email you gave me. Thanks for your time, you won't be disappointed!"</div>
      </div>

      <div style="margin-top:1.5rem;margin-bottom:0.75rem">
        <span style="font-size:var(--text-md);font-weight:700">Common Questions</span>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.35s">
        <div class="script-objection">
          <div class="script-objection-q">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            "How much is it?"
          </div>
          <div class="script-objection-a">
            "It's around <strong>$200 to set up</strong> the website. Then it's only <strong>$50 per month</strong> for the hosting and domain name. Honestly, most of our clients make that back from the very first client they get through the site."
          </div>
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.4s">
        <div class="script-objection">
          <div class="script-objection-q">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            "Who are you? Where are you calling from?"
          </div>
          <div class="script-objection-a">
            "We're <strong>FortX Web</strong> — we've been building websites for contractors for over 10 years now. We're based in Canada and we're currently expanding down into the US. We specialize in websites for businesses like yours."
          </div>
        </div>
      </div>

      <div class="card anim-slide-up" style="animation-delay:0.45s">
        <div class="script-objection">
          <div class="script-objection-q">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            "I'm not interested"
          </div>
          <div class="script-objection-a">
            "Totally understand. But here's the thing — it's completely free to look at. If you hate it, you never hear from us again. But most people are actually impressed when they see what we built for them. Can I just send it over?"
          </div>
        </div>
      </div>
    </div>
  `;
}
