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
  // Custom Tweaklr moon-glass mini-icons replace platform emoji throughout this panel.
  const ICON_PATHS = {
    target:'<path d="M12 3.2l1.9 4.1 4.5.6-3.2 3.1.8 4.5-4-2.1-4 2.1.8-4.5-3.2-3.1 4.5-.6z"/><circle cx="12" cy="12" r="9.3" stroke-dasharray="1.4 3.2"/><path d="M17.7 17.7l2 2"/>',
    timer:'<path d="M12 3.2a8.8 8.8 0 108.8 8.8"/><path d="M12 6.8v5.4l3.6 2"/><path d="M16.2 2.8l.8 2.1 2.2.1-1.7 1.4.6 2.1-1.9-1.2-1.8 1.2.5-2.1-1.6-1.4 2.1-.1z"/>',
    hands:'<path d="M3 12l4-4 3 2 2-1 5 2-5 5-4-2-3 1z"/><path d="M7 8l2-3 3 2m-1 8 2 1 4-4"/>',
    laugh:'<circle cx="12" cy="12" r="9"/><path d="M8 10h.1M16 10h.1M7.5 13a4.5 4.5 0 009 0z"/>',
    cloud:'<path d="M6 18h11a4 4 0 000-8 5.5 5.5 0 00-10-1A4.5 4.5 0 006 18z"/>',
    leaf:'<path d="M20 4C10 4 5 7 5 13a5 5 0 005 5c6 0 9-7 10-14zM4 21l8-9"/>',
    dice:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 8h.1M16 8h.1M12 12h.1M8 16h.1M16 16h.1"/>',
    trophy:'<path d="M8 4h8v5a4 4 0 01-8 0zM8 6H4v2a4 4 0 004 4m8-6h4v2a4 4 0 01-4 4M12 13v5m-4 2h8m-6-2h4"/>',
    heart:'<path d="M12 20S3 14.5 3 8.5A4.5 4.5 0 0112 7a4.5 4.5 0 019 1.5C21 14.5 12 20 12 20z"/>',
    letter:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    moon:'<path d="M19 15A8 8 0 019 5a8 8 0 1010 10z"/><path d="M16 3v3m-1.5-1.5h3"/>',
    handshake:'<path d="M3 10l4-4 4 2 2-1 8 4-7 6-4-2-3 1-4-4z"/><path d="m9 13 3 2m1-4 3 2"/>',
    bag:'<path d="M5 8h14l1 12H4L5 8z"/><path d="M9 8V6a3 3 0 016 0v2m-6 5h6"/>',
    briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18m-11 0v2h4v-2"/>',
    pin:'<path d="M12 21s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/>',
    good:'<path d="M8 11V5a2 2 0 014 0v4h5a2 2 0 012 2l-1 7a2 2 0 01-2 2H9l-4-3v-6z"/>',
    rain:'<path d="M6 14a4 4 0 010-8 6 6 0 0111 2 3 3 0 010 6zM8 17l-1 2m6-2-1 2m6-2-1 2"/>',
    fire:'<path d="M13 2c1 5-4 6-2 10 1-2 3-3 4-5 4 4 5 7 2 11a6 6 0 01-11-3c0-4 3-7 7-13z"/>',
    bubbles:'<circle cx="9" cy="10" r="5"/><circle cx="16" cy="15" r="4"/><circle cx="17" cy="5" r="2"/>'
  };
  function brandIcon(name) {
    return '<svg class="sp-dna-emoji" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="sp-dna-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1D2AE"/><stop offset=".52" stop-color="#B77A80"/><stop offset="1" stop-color="#8B3543"/></linearGradient></defs><circle class="sp-dna-emoji__orb" cx="12" cy="12" r="11"/><g class="sp-dna-emoji__symbol">' + (ICON_PATHS[name] || ICON_PATHS.moon) + '</g></svg>';
  }
  const MOODS = [
    ['sun', 'Sunny'], ['good', 'Good'], ['rain', 'Low-key'], ['fire', 'Energised'], ['bubbles', 'Need calm']
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
  // Signature-tool state is stored in Supabase per Space and signed-in user.
  // No localStorage fallback: a backend failure must never pretend the data was saved.
  let dnaState = {};
  let dnaSpaceId = '';
  let dnaLoaded = false;
  let dnaSaveQueue = Promise.resolve();
  function activeSpaceId() { return activeScreen()?.dataset.spaceId || ''; }
  function read(suffix, fallback) {
    return Object.prototype.hasOwnProperty.call(dnaState, suffix) ? dnaState[suffix] : fallback;
  }
  function write(suffix, value) {
    const spaceId = activeSpaceId();
    if (!spaceId || !window.supabaseClient) {
      announce('Open a saved Space and sign in to save this.');
      return false;
    }
    dnaState[suffix] = value;
    const snapshot = JSON.parse(JSON.stringify(dnaState));
    dnaSaveQueue = dnaSaveQueue.then(async () => {
      const { error } = await window.supabaseClient.rpc('save_ming_space_dna_state', {
        p_space_id: spaceId, p_state: snapshot
      });
      if (error) throw error;
    }).then(() => {
      if (activeSpaceId() === spaceId) announce('Saved to your Space.');
    }).catch(error => {
      console.warn('Tweaklr Spaces signature-tool save failed.', error);
      if (activeSpaceId() === spaceId) announce('Could not save to the database. Run the Spaces DNA migration and try again.');
    });
    return true;
  }
  async function loadDnaState() {
    const spaceId = activeSpaceId();
    if (!spaceId || !window.supabaseClient || !window.supabaseClient.auth) {
      dnaState = {}; dnaSpaceId = ''; dnaLoaded = false; return;
    }
    if (spaceId === dnaSpaceId && dnaLoaded) return;
    dnaSpaceId = spaceId; dnaState = {}; dnaLoaded = false;
    try {
      const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
      if (sessionError || !session?.user) {
        announce('Sign in to load your saved Space tools.');
        return;
      }
      const { data, error } = await window.supabaseClient.rpc('get_ming_space_dna_state', { p_space_id: spaceId });
      if (error) throw error;
      if (activeSpaceId() !== spaceId) return;
      dnaState = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      dnaLoaded = true;
    } catch (error) {
      console.warn('Tweaklr Spaces signature-tool load failed.', error);
      if (activeSpaceId() === spaceId) announce('Could not load saved tools. Run the Spaces DNA migration.');
    }
    if (activeSpaceId() === spaceId) refreshPanel();
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
      '<span class="sp-dna-action__icon" aria-hidden="true">' + brandIcon(icon) + '</span><b>' + label + '</b></button>';
  }
  function renderTools() {
    const screen = activeScreen();
    const head = screen?.querySelector('#sp-head');
    if (!screen || !head || !screen.dataset.nature) return;
    let panel = document.getElementById('sp-dna-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'sp-dna-panel'; panel.className = 'sp-dna-panel';
      panel.setAttribute('aria-label', 'Space signature tools');
      head.insertAdjacentElement('afterend', panel);
    }
    const nature = activeNature();
    const config = {
      business: { title: 'BOARD MODE', desc: 'Keep a goal and deadline close.', buttons: toolButton('goal','Set pinned goal','target') + toolButton('deadline','Set deadline','timer') },
      friendly: { title: 'VIBE CHECK', desc: 'Share your mood with yourself on this device.', buttons: toolButton('mood','Choose mood','hands') + toolButton('joke','Save an inside joke','laugh') },
      casual: { title: 'NO PRESSURE', desc: 'A personal quiet-mode preference. Existing chat receipts are unchanged.', buttons: toolButton('quiet','Toggle quiet preference','cloud') + toolButton('reset-quiet','Reset preference','leaf') },
      silly: { title: 'CHAOS ENGINE', desc: 'A fresh prompt whenever the room needs chaos.', buttons: toolButton('dare','Generate a dare','dice') + toolButton('meme-vote','Vote meme of the day','trophy') },
      romantic: { title: 'FOR TWO', desc: 'Little gestures and a shared-moment countdown.', buttons: toolButton('thinking','Thinking of you','heart') + toolButton('love-note','Write a love letter','letter') + toolButton('rom-countdown','Set countdown','moon') },
      marketplace: { title: 'DEAL STUDIO', desc: 'Work out an offer before you send it in chat.', buttons: toolButton('haggle','Open haggle slider','handshake') + toolButton('claim-note','Save a claim reminder','bag') }
    }[nature];
    if (!config) { panel.hidden = true; return; }
    panel.hidden = false;
    panel.innerHTML = '<div class="sp-dna-top"><div><span class="sp-dna-kicker">TWEAKLR SIGNATURE</span><h3>' + config.title + '</h3><p>' + config.desc + '</p></div><span class="sp-dna-orb" aria-hidden="true">' + brandIcon(({business:'briefcase',friendly:'hands',casual:'cloud',silly:'dice',romantic:'moon',marketplace:'bag'}[nature] || 'moon')) + '</span></div>' +
      '<div class="sp-dna-actions">' + config.buttons + '</div>' + renderSavedSummary(nature);
    panel.dataset.nature = nature;
    panel.dataset.spaceName = activeName();
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
      return goal ? '<div class="sp-dna-saved"><span class="sp-dna-saved-icon">' + brandIcon('pin') + '</span><b>' + esc(goal) + '</b>' + countdown + '</div>' : '';
    }
    if (nature === 'friendly') {
      const mood = read('mood', null), jokes = read('jokes', []);
      const moodIcon = mood ? MOODS.find(m => (m[0] + ' ' + m[1]) === mood)?.[0] : null;
      return '<div class="sp-dna-saved">' + (mood ? '<span class="sp-dna-saved-icon">' + brandIcon(moodIcon || 'moon') + '</span><b>Your vibe today: ' + esc(mood.split(' ').slice(1).join(' ')) + '</b>' : '<span>No mood selected today.</span>') +
        (jokes.length ? '<span>' + jokes.length + ' inside joke' + (jokes.length === 1 ? '' : 's') + ' saved on this device</span>' : '') + '</div>';
    }
    if (nature === 'casual') return '<div class="sp-dna-saved"><span>' + (read('quiet', false) ? 'Quiet preference is on (visual preference only).' : 'No-pressure preference is off.') + '</span></div>';
    if (nature === 'silly') return '<div class="sp-dna-saved"><span>' + esc(read('dare', 'Ready for a little chaos?')) + '</span></div>';
    if (nature === 'romantic') {
      const date = read('rom-date', '');
      return '<div class="sp-dna-saved"><span class="sp-dna-saved-icon">' + brandIcon(date ? 'moon' : 'heart') + '</span><span>' + (date ? 'Countdown: ' + esc(date) : 'Your little rituals, kept personal on this device.') + '</span></div>';
    }
    if (nature === 'marketplace') {
      const claim = read('claim', '');
      return '<div class="sp-dna-saved"><span class="sp-dna-saved-icon">' + brandIcon('bag') + '</span><span>' + (claim ? 'Reminder saved: ' + esc(claim) : 'Compare an offer before you send it.') + '</span></div>';
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
  async function handle(action) {
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
        const choice = ask('Choose a mood: ' + MOODS.map((m,i) => (i+1)+'. '+m[1]).join(' | '), '1');
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
        write('thinking-count', count); announce('Thinking of you. Gesture recorded on this device.'); break;
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
    let lastSpaceId = '';
    const observer = new MutationObserver(() => {
      if (screen.dataset.nature) {
        const id = activeSpaceId();
        if (id && id !== lastSpaceId) {
          lastSpaceId = id;
          loadDnaState();
        }
        if (!document.getElementById('sp-dna-panel')) renderTools();
        else {
          const panel = document.getElementById('sp-dna-panel');
          if (panel.dataset.nature !== activeNature() || panel.dataset.spaceName !== activeName()) refreshPanel();
        }
      }
    });
    observer.observe(screen, {attributes:true, childList:true, subtree:true, attributeFilter:['data-nature']});
    renderTools();
    if (activeSpaceId()) { lastSpaceId = activeSpaceId(); loadDnaState(); }
    document.addEventListener('click', function (event) {
      if (event.target.closest('#screen-space [data-sp]')) setTimeout(refreshPanel, 80);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
