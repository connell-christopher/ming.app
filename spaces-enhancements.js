/* Tweaklr Spaces DNA add-on.
 * Additive companion module: never replaces existing Space renderers,
 * message handlers, or backend state. Experimental personal tools are
 * explicitly stored on this device until shared backend actions exist.
 */
(function () {
  'use strict';
  if (window.__tweaklrSpacesDNAInstalled) return;
  window.__tweaklrSpacesDNAInstalled = true;

  const ROOT = '#screen-space';
  const MOODS = [
    ['☀️', 'Sunny'], ['💛', 'Good'], ['🌧️', 'Low-key'], ['🔥', 'Energised'], ['🫧', 'Need calm']
  ];
  const DARES = [
    'Send the most dramatic voice note you can in 10 seconds.',
    'Describe your day using only three emojis.',
    'Give someone in this Space a ridiculously specific compliment.',
    'Invent a new holiday and explain how everyone celebrates it.',
    'Share a harmless hot take and defend it for one minute.',
    'Create a meme caption for the last thing you ate.',
    'Talk like a movie trailer narrator for your next three messages.'
  ];

  function activeScreen() { return document.querySelector(ROOT); }
  function activeNature() { return activeScreen()?.dataset.nature || ''; }
  function activeName() {
    return document.querySelector(ROOT + ' .sp-bar .ttl .n')?.textContent?.trim() || 'Space';
  }
  function key(suffix) {
    return 'tweaklr_spaces_dna_v1:' + encodeURIComponent(activeNature()) + ':' +
      encodeURIComponent(activeName()) + ':' + suffix;
  }
  function read(suffix, fallback) {
    try { const v = localStorage.getItem(key(suffix)); return v === null ? fallback : JSON.parse(v); }
    catch (_) { return fallback; }
  }
  function write(suffix, value) {
    try { localStorage.setItem(key(suffix), JSON.stringify(value)); return true; }
    catch (_) { announce('Could not save on this device.'); return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function announce(message) {
    let n = document.getElementById('sp-dna-notice');
    if (!n) {
      n = document.createElement('div'); n.id = 'sp-dna-notice';
      n.className = 'sp-dna-notice'; n.setAttribute('role', 'status');
      const host = document.querySelector(ROOT + ' .sp-head');
      if (host) host.appendChild(n);
    }
    if (n) { n.textContent = message; n.hidden = false; clearTimeout(n._timer); n._timer = setTimeout(() => { n.hidden = true; }, 2600); }
  }
  function toolButton(action, label, icon) {
    return '<button type="button" class="sp-dna-action" data-sp-dna="' + action + '">' +
      '<span aria-hidden="true">' + icon + '</span><b>' + label + '</b></button>';
  }
  function renderTools() {
    const screen = activeScreen();
    const head = screen?.querySelector('#sp-head');
    if (!screen || !head || !screen.classList.contains('is-active') && !screen.classList.contains('active')) return;
    let panel = document.getElementById('sp-dna-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'sp-dna-panel'; panel.className = 'sp-dna-panel';
      panel.setAttribute('aria-label', 'Space signature tools');
      head.insertAdjacentElement('afterend', panel);
    }
    const nature = activeNature();
    const config = {
      business: { title: 'BOARD MODE', desc: 'Keep a goal and deadline close.', buttons: toolButton('goal','Set pinned goal','🎯') + toolButton('deadline','Set deadline','⏳') },
      friendly: { title: 'VIBE CHECK', desc: 'Share your mood with yourself on this device.', buttons: toolButton('mood','Choose mood','🫶') + toolButton('joke','Save an inside joke','😂') },
      casual: { title: 'NO PRESSURE', desc: 'A personal quiet-mode preference. Existing chat receipts are unchanged.', buttons: toolButton('quiet','Toggle quiet preference','☁️') + toolButton('reset-quiet','Reset preference','🌿') },
      silly: { title: 'CHAOS ENGINE', desc: 'A fresh prompt whenever the room needs chaos.', buttons: toolButton('dare','Generate a dare','🎲') + toolButton('meme-vote','Vote meme of the day','🏆') },
      romantic: { title: 'FOR TWO', desc: 'Little gestures and a shared-moment countdown.', buttons: toolButton('thinking','Thinking of you','💗') + toolButton('love-note','Write a love letter','💌') + toolButton('rom-countdown','Set countdown','🌙') },
      marketplace: { title: 'DEAL STUDIO', desc: 'Work out an offer before you send it in chat.', buttons: toolButton('haggle','Open haggle slider','🤝') + toolButton('claim-note','Save a claim reminder','🛍️') }
    }[nature];
    if (!config) { panel.hidden = true; return; }
    panel.hidden = false;
    panel.innerHTML = '<div class="sp-dna-top"><div><span class="sp-dna-kicker">TWEAKLR SIGNATURE</span><h3>' + config.title + '</h3><p>' + config.desc + '</p></div><span class="sp-dna-orb" aria-hidden="true">' + ({business:'💼',friendly:'🤝',casual:'☕',silly:'🤡',romantic:'🔐',marketplace:'🏪'}[nature] || '✦') + '</span></div>' +
      '<div class="sp-dna-actions">' + config.buttons + '</div>' + renderSavedSummary(nature);
    panel.dataset.nature = nature;
  }
  function renderSavedSummary(nature) {
    if (nature === 'business') {
      const goal = read('goal', '');
      const deadline = read('deadline', '');
      let countdown = '';
      if (deadline) {
        const ms = new Date(deadline).getTime() - Date.now();
        countdown = '<span class="sp-dna-summary">' + (Number.isFinite(ms) ? (ms >= 0 ? Math.ceil(ms / 3600000) + ' hours left' : 'Deadline passed') : 'Deadline saved') + '</span>';
      }
      return goal ? '<div class="sp-dna-saved"><b>📌 ' + esc(goal) + '</b>' + countdown + '</div>' : '';
    }
    if (nature === 'friendly') {
      const mood = read('mood', null), jokes = read('jokes', []);
      return '<div class="sp-dna-saved">' + (mood ? '<b>Your vibe today: ' + esc(mood) + '</b>' : '<span>No mood selected today.</span>') +
        (jokes.length ? '<span>' + jokes.length + ' inside joke' + (jokes.length === 1 ? '' : 's') + ' saved on this device</span>' : '') + '</div>';
    }
    if (nature === 'casual') return '<div class="sp-dna-saved"><span>' + (read('quiet', false) ? '☁️ Quiet preference is on (visual preference only).' : 'No-pressure preference is off.') + '</span></div>';
    if (nature === 'silly') return '<div class="sp-dna-saved"><span>' + esc(read('dare', 'Ready for a little chaos?')) + '</span></div>';
    if (nature === 'romantic') {
      const date = read('rom-date', '');
      return '<div class="sp-dna-saved"><span>' + (date ? '🌙 Countdown: ' + esc(date) : '💗 Your little rituals, kept personal on this device.') + '</span></div>';
    }
    if (nature === 'marketplace') {
      const claim = read('claim', '');
      return '<div class="sp-dna-saved"><span>' + (claim ? '🛍️ Reminder saved: ' + esc(claim) : 'Compare an offer before you send it.') + '</span></div>';
    }
    return '';
  }
  function refreshPanel() {
    const p = document.getElementById('sp-dna-panel');
    if (p) { p.remove(); }
    renderTools();
  }
  function ask(label, initial) {
    const result = window.prompt(label, initial || '');
    return result === null ? null : result.trim();
  }
  function handle(action) {
    switch (action) {
      case 'goal': {
        const v = ask('Set a pinned goal for this Business Space:', read('goal', ''));
        if (v === null) return;
        write('goal', v); announce(v ? 'Goal saved on this device.' : 'Goal cleared.'); break;
      }
      case 'deadline': {
        const old = read('deadline', '');
        const v = ask('Enter deadline as YYYY-MM-DD HH:MM (local time):', old.replace('T', ' ').slice(0, 16));
        if (v === null) return;
        const parsed = new Date(v.replace(' ', 'T'));
        if (v && !Number.isFinite(parsed.getTime())) { announce('Use YYYY-MM-DD HH:MM.'); return; }
        write('deadline', v ? parsed.toISOString() : ''); announce(v ? 'Deadline saved on this device.' : 'Deadline cleared.'); break;
      }
      case 'mood': {
        const choice = ask('Choose a mood: ' + MOODS.map((m,i) => (i+1)+'. '+m[0]+' '+m[1]).join(' | '), '1');
        if (choice === null) return;
        const mood = MOODS[Number(choice)-1];
        if (!mood) { announce('Choose a number from 1 to ' + MOODS.length + '.'); return; }
        write('mood', mood[0] + ' ' + mood[1]); announce('Vibe saved for you on this device.'); break;
      }
      case 'joke': {
        const v = ask('Save an inside joke (do not include anything private you would not want stored locally):');
        if (v === null || !v) return;
        const jokes = read('jokes', []); jokes.unshift({text:v, at:Date.now()});
        write('jokes', jokes.slice(0, 30)); announce('Inside joke saved on this device.'); break;
      }
      case 'quiet': write('quiet', !read('quiet', false)); announce(read('quiet', false) ? 'Quiet preference enabled. Existing receipts are unchanged.' : 'Quiet preference disabled.'); break;
      case 'reset-quiet': write('quiet', false); announce('Quiet preference reset.'); break;
      case 'dare': {
        const dare = DARES[Math.floor(Math.random() * DARES.length)];
        write('dare', dare); announce(dare); break;
      }
      case 'meme-vote': {
        const v = ask('Vote for today’s funniest meme. Enter the member name or meme description:');
        if (v === null || !v) return;
        write('meme-vote', {vote:v, at:Date.now()}); announce('Your vote is recorded on this device only.'); break;
      }
      case 'thinking': {
        const count = Number(read('thinking-count', 0)) + 1;
        write('thinking-count', count); announce('💗 Thinking of you. Gesture recorded on this device.'); break;
      }
      case 'love-note': {
        const note = ask('Write your love letter. It will be saved on this device only; it is not sent to the other member.');
        if (note === null || !note) return;
        const notes = read('love-notes', []); notes.unshift({text:note, at:Date.now()});
        write('love-notes', notes.slice(0, 20)); announce('Love letter saved privately on this device, not sent.'); break;
      }
      case 'rom-countdown': {
        const v = ask('What date are you counting down to? (YYYY-MM-DD)', read('rom-date', ''));
        if (v === null) return;
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) { announce('Use YYYY-MM-DD.'); return; }
        write('rom-date', v); announce(v ? 'Countdown date saved on this device.' : 'Countdown cleared.'); break;
      }
      case 'haggle': {
        const raw = ask('Enter the listed price (number only):');
        if (raw === null) return;
        const price = Number(raw);
        if (!Number.isFinite(price) || price <= 0) { announce('Enter a valid price greater than zero.'); return; }
        const offer = document.createElement('div'); offer.className = 'sp-dna-offer';
        offer.innerHTML = '<label for="sp-dna-haggle-range">Your offer: <strong id="sp-dna-haggle-value"></strong></label><input id="sp-dna-haggle-range" type="range" min="50" max="100" value="85" step="1"><small>Slider sets your offer from 50% to 100% of the listed price. It does not contact the seller.</small>';
        document.getElementById('sp-dna-panel')?.appendChild(offer);
        const range = offer.querySelector('input'), value = offer.querySelector('strong');
        const update = () => { value.textContent = (price * Number(range.value) / 100).toLocaleString(undefined,{maximumFractionDigits:2}) + ' (' + range.value + '%)'; };
        range.addEventListener('input', update); update(); break;
      }
      case 'claim-note': {
        const v = ask('Save a reminder for an item you want to claim (item name or link):');
        if (v === null || !v) return;
        write('claim', v); announce('Claim reminder saved on this device; no item has been reserved.'); break;
      }
    }
    refreshPanel();
  }
  document.addEventListener('click', function (event) {
    const btn = event.target.closest('[data-sp-dna]');
    if (!btn || !document.querySelector(ROOT + ' #sp-dna-panel')) return;
    event.preventDefault();
    event.stopPropagation();
    handle(btn.dataset.spDna);
  }, true);

  // Observe only the Space header; existing app renderers remain untouched.
  function start() {
    const screen = activeScreen();
    if (!screen) return;
    const observer = new MutationObserver(() => {
      if (screen.dataset.nature) {
        if (!document.getElementById('sp-dna-panel')) renderTools();
        else {
          const panel = document.getElementById('sp-dna-panel');
          if (panel.dataset.nature !== activeNature()) refreshPanel();
        }
      }
    });
    observer.observe(screen, {attributes:true, childList:true, subtree:true, attributeFilter:['data-nature']});
    renderTools();
    document.addEventListener('click', function (event) {
      if (event.target.closest('#screen-space [data-sp]')) setTimeout(refreshPanel, 80);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
