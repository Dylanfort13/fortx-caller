const KITTER_AVATAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M4 8c0-3 1-6 3-6s2 2 2 2"/><path d="M20 8c0-3-1-6-3-6s-2 2-2 2"/></svg>`;

function renderChat(container) {
  const caller = Auth.getCaller();
  const ONBOARD_KEY = `fortx_onboard_${caller.id}`;
  const HISTORY_KEY = `fortx_chat_${caller.id}`;
  const isOnboarded = localStorage.getItem(ONBOARD_KEY) === 'done';
  let messages = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  let onboardingStep = 0;
  let goalPushCount = 0;

  container.innerHTML = `
    <div style="padding-top:1.5rem">
      <div class="page-title">Kitter</div>
      <div class="page-subtitle">Your AI calling coach</div>
    </div>
    <div id="chat-messages" style="margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem;padding-bottom:140px"></div>
    <div class="chat-input-bar" id="chat-input-bar" style="display:none">
      <input type="text" class="chat-input" id="chat-input" placeholder="Ask Kitter anything..." autocomplete="off">
      <button class="chat-send-btn" id="chat-send-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div id="quick-replies" style="position:fixed;bottom:120px;left:0;right:0;padding:0.5rem 1rem;display:none;gap:0.5rem;flex-wrap:wrap;justify-content:center;z-index:45"></div>
  `;

  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const quickReplies = document.getElementById('quick-replies');

  renderMessages();

  if (!isOnboarded) {
    startOnboarding();
  } else {
    document.getElementById('chat-input-bar').style.display = 'flex';
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach(m => appendMessage(m.role, m.content, false));
    scrollToBottom();
  }

  function appendMessage(role, content, animate = true) {
    const div = document.createElement('div');
    div.className = `chat-bubble ${role === 'user' ? 'chat-bubble-user' : 'chat-bubble-kitter'}`;

    if (role === 'kitter') {
      const avatar = document.createElement('div');
      avatar.className = 'chat-avatar';
      avatar.innerHTML = KITTER_AVATAR;
      div.appendChild(avatar);
    }

    const textEl = document.createElement('div');
    textEl.className = 'chat-text';

    if (animate && role === 'kitter') {
      textEl.textContent = '';
      div.appendChild(textEl);
      messagesEl.appendChild(div);
      scrollToBottom();
      typeText(textEl, content);
    } else {
      textEl.textContent = content;
      div.appendChild(textEl);
      messagesEl.appendChild(div);
      scrollToBottom();
    }
  }

  function typeText(el, text) {
    const words = text.split(' ');
    let i = 0;
    const interval = setInterval(() => {
      if (i >= words.length) { clearInterval(interval); return; }
      el.textContent += (i > 0 ? ' ' : '') + words[i];
      i++;
      scrollToBottom();
    }, 30);
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-bubble chat-bubble-kitter';
    div.id = 'typing-indicator';
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.innerHTML = KITTER_AVATAR;
    div.appendChild(avatar);
    const dots = document.createElement('div');
    dots.className = 'chat-typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    div.appendChild(dots);
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }

  function saveMessages() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
  }

  function showQuickReplies(replies) {
    quickReplies.innerHTML = '';
    quickReplies.style.display = 'flex';
    replies.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'chat-quick-reply';
      btn.textContent = r.label;
      btn.addEventListener('click', () => {
        quickReplies.style.display = 'none';
        if (r.action) r.action();
        else handleUserMessage(r.label);
      });
      quickReplies.appendChild(btn);
    });
  }

  function startOnboarding() {
    setTimeout(() => {
      const welcome = `Hey ${caller.name}! I'm Kitter, your AI calling coach. I'm here to help you crush it on the phones.

Here's a quick tour of the app:

HOME — Your command center. See your calls today, streak, earnings potential, and your next lead to call. Just tap "Call" and the phone opens. When you come back, tell me what happened.

LEADS — All your assigned leads in one list.

EARNINGS — Track your commissions. Every Demo Agreed = $260 CAD.

LEADERBOARD — See how you stack up against the other callers this week.

SCRIPT — The full cold call script with common objections and how to handle them.

CHAT (you're here!) — Ask me anything. Stuck on a call? Not sure what to say? I got you.

Click "Let's get started" below to set up your day!`;

      addKitterMessage(welcome);

      setTimeout(() => {
        showQuickReplies([
          { label: "Let's get started!", action: () => onboardingGoalStep() }
        ]);
      }, 500);
    }, 600);
  }

  function onboardingGoalStep() {
    addKitterMessage("First things first — let's set your daily call goal. How many calls do you want to make per day?");
    showQuickReplies([
      { label: '10 calls' },
      { label: '30 calls' },
      { label: '50 calls' },
      { label: '100 calls' },
    ]);
    onboardingStep = 1;
    goalPushCount = 0;
  }

  async function handleUserMessage(text) {
    messages.push({ role: 'user', content: text });
    appendMessage('user', text);
    saveMessages();

    if (onboardingStep === 1) {
      const num = parseGoalNumber(text);
      await handleGoalSetting(num, text);
      return;
    }

    quickReplies.style.display = 'none';
    showTyping();

    try {
      const apiMessages = messages.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      const data = await API.chatWithKitter(apiMessages);
      hideTyping();
      messages.push({ role: 'kitter', content: data.reply });
      appendMessage('kitter', data.reply, true);
      saveMessages();
    } catch (e) {
      hideTyping();
      const errMsg = "Hmm, I'm having trouble connecting right now. Try again in a sec!";
      messages.push({ role: 'kitter', content: errMsg });
      appendMessage('kitter', errMsg, false);
      saveMessages();
    }
  }

  function parseGoalNumber(text) {
    const num = parseInt(text.replace(/[^0-9]/g, ''));
    if (!isNaN(num) && num > 0) return num;
    if (/stick|stay|keep|same|fine|ok|sure/i.test(text) && goalPushCount > 0) return 0;
    return 30;
  }

  async function handleGoalSetting(num, rawText) {
    goalPushCount++;

    if (num < 10 && goalPushCount === 1) {
      addKitterMessage(`${num}? Come on ${caller.name}, that's barely warming up! You'd spend more time scrolling your phone between calls than actually calling. Even 30 calls takes less than 2 hours — and that could land you a $260 demo. Let's aim higher — you'll thank yourself when the commissions roll in. What do you say?`);
      showQuickReplies([
        { label: 'Fine, 30 calls' },
        { label: '50 calls' },
        { label: `No, I'm sticking with ${num}` },
      ]);
      return;
    }

    if (num < 10 && goalPushCount >= 2) {
      addKitterMessage(`Look, I get it — ${num} calls feels comfortable. But hear me out: 30 calls takes about 90 minutes. That's it. And statistically, every 30 calls gets you roughly 1 demo agreed. That's $260 for 90 minutes of work. With ${num} calls? You're looking at maybe 15 minutes of calling and $0 guaranteed. You could literally TRIPLE your earnings just by spending one more hour on the phone. Is ${num} really worth leaving that money on the table?`);
      showQuickReplies([
        { label: 'Ok fine, 30 calls' },
        { label: '50 calls' },
        { label: `I'm doing ${num}, period` },
      ]);
      return;
    }

    if (num >= 10 && num < 30 && goalPushCount === 1) {
      addKitterMessage(`${num} calls? You can definitely do more than that. Here's the thing — cold calling is a numbers game. The more calls you make, the more demos you get, and demos = $260 each. Even bumping to 30 gives you a way better shot at landing one. What do you say?`);
      showQuickReplies([
        { label: 'Ok, 30 calls' },
        { label: '50 calls' },
        { label: `I'll stick with ${num}` },
      ]);
      return;
    }

    if (num >= 10 && num < 30 && goalPushCount >= 2) {
      addKitterMessage(`Alright ${caller.name}, I respect the choice. But just so you know — ${num} calls is about ${Math.round(num * 3)} minutes on the phone. Going to 30 would only add ${Math.round((30 - num) * 3)} more minutes, but could be the difference between $0 and $260 today. Your call!`);
      showQuickReplies([
        { label: 'Actually, 30 calls' },
        { label: `Let's go with ${num}` },
      ]);
      return;
    }

    if (num === 0) {
      const fallback = [10, 30][Math.min(goalPushCount - 1, 1)];
      await finalizeGoal(fallback);
      return;
    }

    if (num >= 30 && num < 50) {
      addKitterMessage(`${num} calls — solid! That's a good baseline. But honestly? 50+ is where the magic happens. More calls = more demos = more money. If you're really motivated to make bank, 100 is the dream. But ${num} is a great start!`);
      await finalizeGoal(num);
      return;
    }

    if (num >= 50 && num < 100) {
      addKitterMessage(`${num} calls! Now we're talking. That's how you make real money. Let's set it up!`);
      await finalizeGoal(num);
      return;
    }

    if (num >= 100) {
      addKitterMessage(`100 calls?! I love the energy ${caller.name}. Let's make it happen!`);
      await finalizeGoal(num);
      return;
    }

    await finalizeGoal(num || 30);
  }

  async function finalizeGoal(num) {
    try {
      await API.setGoal(num);
      addKitterMessage(`Done! Your daily goal is set to ${num} calls. You can always change it from the Home tab. Now go get 'em!`);
    } catch {
      addKitterMessage(`Your goal is ${num} calls! (I couldn't save it automatically — you can set it manually from the Home tab)`);
    }

    localStorage.setItem(ONBOARD_KEY, 'done');
    onboardingStep = 0;
    saveMessages();
    setTimeout(() => {
      document.getElementById('chat-input-bar').style.display = 'flex';
    }, 2000);
  }

  function addKitterMessage(text) {
    messages.push({ role: 'kitter', content: text });
    showTyping();
    setTimeout(() => {
      hideTyping();
      appendMessage('kitter', text, true);
      saveMessages();
    }, 800 + Math.random() * 600);
  }

  function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    handleUserMessage(text);
  }
}
