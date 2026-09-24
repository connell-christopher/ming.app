  /*============================
     APP.JS  
  ============================*/
  /* ============================================================
   ming — People. Moments. Possibilities.
   app.js  ·  vanilla JS, no dependencies
   Sections: Utilities · Demo Data · App State · Rendering atoms
             Navigation · Location · Home · Discover · Nearby
             Daily Updates · Connections · Messaging · Moonflower
             Profile · Search · Notifications · Sheets · Modals
             Toasts · Actions · Boot
   ============================================================ */

/* ------------------------------------------------------------
   SUPABASE CONNECTION
------------------------------------------------------------ */

const SUPABASE_URL = 'https://avnuejgqaxygxeiyqeny.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_wF8lZnLfC-x9ySqXUqRcHQ_CI_QWrHW';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const IS_APP_PAGE = document.getElementById('app') !== null;


if (IS_APP_PAGE) {

/* ------------------------------------------------------------
   UTILITIES
------------------------------------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
const HOUR = 36e5;
const now = () => Date.now();
const uid = p => p + '_' + Math.random().toString(36).slice(2, 9);

function timeAgo(ts) {
  const m = Math.floor((now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : d + 'd ago';
}
function clockTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function hoursLeft(u) {
  return Math.max(0, (u.createdAt + 24 * HOUR - now()) / HOUR);
}
function lifeLabel(u) {
  const h = hoursLeft(u);
  if (h <= 0) return 'Gone';
  if (h < 1) return `Disappears in ${Math.max(1, Math.round(h * 60))}m`;
  return `Disappears in ${Math.round(h)}h`;
}
/* Display only. Coordinates are never shown; distance is deliberately coarse. */
function distLabel(km) {
  if (km === null || km === undefined || !isFinite(km)) return 'Distance hidden';
  if (km < 0.15) return 'Nearby';
  if (km < 10) return km.toFixed(1) + ' km away';
  return Math.round(km) + ' km away';
}
function greetWord() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ------------------------------------------------------------
   DEMO DATA  (shaped so a backend can drop straight in)
------------------------------------------------------------ */
const currentUser = {
  id: 'u_me',
  name: 'Connell Christopher',
  username: '@connell',
  usernameChangedAt: null,
  hue: 24,
  headline: 'Application Security',
  tags: ['Technology', 'Cybersecurity', 'Software'],
  bio: 'Breaking things carefully so other people can build safely. Usually somewhere with good coffee and bad wifi.',
  interests: ['Security research', 'Football', 'Film photography', 'Jollof debates', 'Long walks', 'Open source'],
  activity: 'Working from a café until 6',
  joined: 'Joined March 2025'
};

/* ------------------------------------------------------------
   MING CURRENT USER PROFILE
------------------------------------------------------------ */

(async function loadMingCurrentUserProfile() {

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session?.user) {
      return;
    }

    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('id, username, username_changed_at, display_name, avatar_url, bio, created_at, updated_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !profile) {
      console.warn('Ming: could not load current profile.');
      return;
    }

    currentUser.id = profile.id;
    currentUser.name =
      profile.display_name ||
      session.user.user_metadata?.display_name ||
      currentUser.name;

    currentUser.username = profile.username
      ? '@' + profile.username.replace(/^@/, '')
      : currentUser.username;

    currentUser.usernameChangedAt = profile.username_changed_at || null;

    currentUser.bio = profile.bio || currentUser.bio;

    /*
       The app renders its demo UI asynchronously. The profile request can
       finish before or after that first render, so refresh the active views
       here after the real profile has arrived. This prevents the demo name
       from winning a race against Supabase.
    */
    const greeting = document.getElementById('greeting');
    if (greeting) {
      greeting.textContent = `${greetWord()}, ${currentUser.name.split(' ')[0]}`;
    }

    const moonTitle = document.getElementById('moon-title');
    if (moonTitle) {
      moonTitle.textContent = `${greetWord()}, ${currentUser.name.split(' ')[0]}.`;
    }

    if (typeof state !== 'undefined') {
      if (state.loaded?.home) renderHome();
      if (state.loaded?.profile) renderProfile();
      if (state.tab === 'moonflower') renderMoonflower();
    }

    console.log('Ming: current profile loaded and active views refreshed.');

  } catch (error) {
    console.warn('Ming: current profile load failed.', error);
  }

})();

const people = [
  { id: 'p1', name: 'Maya Okafor', short: 'Maya', hue: 340, tag: 'Designer · Entrepreneur', interests: ['Brand design', 'Ceramics', 'Coffee'], bio: 'Building a small design studio. Happy to trade feedback over coffee.', off: { e: -350, n: 600 }, status: 'on', activity: 'Sketching at Neo Café', visitor: false },
  { id: 'p2', name: 'Ibrahim Danjuma', short: 'Ibrahim', hue: 200, tag: 'Developer · Technology', interests: ['Backend', 'Chess', 'Running'], bio: 'Writing Go, breaking builds, fixing them again. Looking for a weekend project partner.', off: { e: 1000, n: -660 }, status: 'on', activity: 'Open to a working session', visitor: false },
  { id: 'p3', name: 'Tomi Adeleke', short: 'Tomi', hue: 28, tag: 'Photography · Student', interests: ['Film photography', 'Street', 'Music'], bio: 'Final year student. I shoot on a beaten-up Canon and I will photograph almost anything.', off: { e: -1400, n: -1280 }, status: 'away', activity: 'Free this weekend', visitor: false },
  { id: 'p4', name: 'Alex Nwosu', short: 'Alex', hue: 148, tag: 'Fitness · Music', interests: ['Football', 'Gym', 'Afrobeats'], bio: 'Five-a-side most evenings. Always short two players.', off: { e: 300, n: 270 }, status: 'on', activity: 'Football at 7', visitor: false },
  { id: 'p5', name: 'Sarah Bello', short: 'Sarah', hue: 268, tag: 'Marketing · Travel', interests: ['Brand strategy', 'Hiking', 'Markets'], bio: 'Marketing lead by day, aggressively curious about new neighbourhoods by evening.', off: { e: 2000, n: 1300 }, status: null, activity: 'Exploring the next neighbourhood over', visitor: false },
  { id: 'p6', name: 'Lena Fischer', short: 'Lena', hue: 188, tag: 'Visiting · Architecture', interests: ['Architecture', 'Food', 'Cycling'], bio: 'Here for ten days from Berlin. Would love to see the city with someone who actually lives here.', off: { e: -200, n: -1480 }, status: 'on', activity: 'New in town', visitor: true },
  { id: 'p7', name: 'Chidi Eze', short: 'Chidi', hue: 12, tag: 'Barista · Roaster', interests: ['Coffee', 'Vinyl', 'Cooking'], bio: 'I pull shots at a small place round the corner. Ask me where to eat.', off: { e: -120, n: -275 }, status: 'on', activity: 'Behind the bar till 8', visitor: false },
  { id: 'p8', name: 'Aisha Yusuf', short: 'Aisha', hue: 306, tag: 'Nurse · Volunteer', interests: ['Health', 'Reading', 'Gardening'], bio: 'Night shifts, quiet mornings. Runs a small first-aid workshop once a month.', off: { e: -2900, n: 1100 }, status: 'away', activity: 'Off shift today', visitor: false },
  { id: 'p9', name: 'Kunle Bamgbose', short: 'Kunle', hue: 88, tag: 'Carpenter · Furniture', interests: ['Woodwork', 'Design', 'Football'], bio: 'Tables, shelves, small repairs. Twelve years of sawdust.', off: { e: -1000, n: -1960 }, status: null, activity: 'Taking commissions', visitor: false },
  { id: 'p10', name: 'Priya Menon', short: 'Priya', hue: 222, tag: 'Visiting · Data science', interests: ['Data', 'Yoga', 'Street food'], bio: 'Here for a two-week project. Looking for a good running route and better suya.', off: { e: 800, n: -410 }, status: 'on', activity: 'Visiting for 2 weeks', visitor: true }
];
const byId = id => people.find(p => p.id === id) || null;

const KINDS = {
  service: { label: 'Side hustle', cls: '' },
  hiring: { label: 'Hiring', cls: 'k-hiring' },
  alert: { label: 'Local alert', cls: 'k-alert' },
  sale: { label: 'For sale', cls: 'k-sale' },
  talk: { label: 'Someone to talk to', cls: 'k-talk' },
  visitor: { label: 'Visiting', cls: 'k-visitor' },
  activity: { label: 'Activity', cls: 'k-activity' },
  general: { label: 'Update', cls: '' }
};

let dailyUpdates = [
  { id: 'd1', authorId: 'p4', kind: 'activity', title: 'Anyone playing football tonight?', body: 'Five-a-side at the pitch down the road, 7pm. We are two short and the other side is unfortunately quite good.', createdAt: now() - 2.2 * HOUR, likes: 14, liked: false, comments: [{ id: 'c1', authorId: 'p2', text: 'I can come. Do you have a spare bib?', at: now() - 1.4 * HOUR }] },
  { id: 'd2', authorId: 'p1', kind: 'hiring', title: 'Need a photographer tomorrow', body: 'Small studio opening, about two hours of work in the morning. Looking for someone nearby who can photograph a little event. Paid.', createdAt: now() - 5 * HOUR, likes: 9, liked: false, comments: [] },
  { id: 'd3', authorId: 'p6', kind: 'visitor', title: 'New in town', body: 'Just arrived from Berlin and looking for interesting places to explore — markets, old buildings, anywhere with a view. Recommendations welcome.', createdAt: now() - 9 * HOUR, likes: 22, liked: true, comments: [{ id: 'c2', authorId: 'p7', text: 'Come by the café, I will draw you a map.', at: now() - 7 * HOUR }] },
  { id: 'd4', authorId: 'p9', kind: 'service', title: 'Shelving and small repairs this week', body: 'I have three free days. Floating shelves, wardrobe doors, wobbly chairs. I bring my own tools.', createdAt: now() - 13 * HOUR, likes: 6, liked: false, comments: [] },
  { id: 'd5', authorId: 'p8', kind: 'alert', title: 'Burst pipe on the main road', body: 'Traffic is backed up near the junction.  Give it thirty minutes if you can.', createdAt: now() - 1.1 * HOUR, likes: 31, liked: false, comments: [] },
  { id: 'd6', authorId: 'p3', kind: 'talk', title: 'Long week, anyone free to talk?', body: 'Nothing dramatic. Just would rather not spend another evening in my own head. Happy to meet somewhere public for coffee.', createdAt: now() - 3.6 * HOUR, likes: 18, liked: false, comments: [] },
  { id: 'd7', authorId: 'p7', kind: 'sale', title: 'Selling a hand grinder', body: 'Barely used, upgraded to an electric one. ₦28,000 and I will throw in a bag of beans.', createdAt: now() - 20 * HOUR, likes: 4, liked: false, comments: [] },
  { id: 'd8', authorId: 'p5', kind: 'general', title: 'The hill at sunrise', body: 'Went up at six this morning with no plan and came back with the best hour of my week. Go before seven, it empties out fast.', createdAt: now() - 7.5 * HOUR, likes: 27, liked: false, comments: [] }
];

const opportunities = [
  { id: 'o1', kind: 'Looking for a photographer', title: 'Two hours, small studio opening', body: 'Morning shoot a few streets away. Paid, same day.', authorId: 'p1' },
  { id: 'o2', kind: 'Looking for a developer', title: 'Weekend project, split the work', body: 'Small booking tool for a local gym. Go or Node.', authorId: 'p2' },
  { id: 'o3', kind: 'Offering carpentry', title: 'Shelving, doors and repairs', body: 'Three free days this week. Own tools.', authorId: 'p9' },
  { id: 'o4', kind: 'Looking for a designer', title: 'Logo for a small food brand', body: 'Two-week turnaround, flexible on budget.', authorId: 'p5' },
  { id: 'o5', kind: 'Offering first aid class', title: 'Free session on Saturday', body: 'Basic first aid for ten people, ten minutes away.', authorId: 'p8' }
];

const moments = [
  { id: 'm1', authorId: 'p7', text: 'Roasted a small batch this morning. The whole street smells like it.', hue: 22, ago: '40m ago' },
  { id: 'm2', authorId: 'p5', text: 'Sunrise from the hill on the north side. Worth the 5am alarm.', hue: 268, ago: '2h ago' },
  { id: 'm3', authorId: 'p3', text: 'Last roll of film from the market. Twelve keepers out of thirty-six.', hue: 30, ago: '3h ago' },
  { id: 'm4', authorId: 'p6', text: 'Someone drew me a map on a napkin. Following it exactly.', hue: 188, ago: '5h ago' },
  { id: 'm5', authorId: 'p4', text: 'Won 4–3. I am claiming two of those.', hue: 148, ago: '6h ago' }
];

const activities = [
  { id: 'a1', title: 'Five-a-side football', place: 'The five-a-side pitch', hostId: 'p4', hour: '7:00', day: 'Tonight', going: 8, off: { e: 400, n: 300 } },
  { id: 'a2', title: 'Morning run, 6km loop', place: 'The lake path', hostId: 'p2', hour: '6:15', day: 'Tomorrow', going: 5, off: { e: -900, n: 1080 } },
  { id: 'a3', title: 'Film photography walk', place: 'The main market', hostId: 'p3', hour: '4:30', day: 'Saturday', going: 11, off: { e: -1600, n: -1200 } },
  { id: 'a4', title: 'Cupping and open bar', place: 'The corner café', hostId: 'p7', hour: '11:00', day: 'Sunday', going: 6, off: { e: -120, n: -275 } }
];

const places = [
  { id: 'pl1', name: 'The corner café', kind: 'Coffee · Slow mornings', hue: 26, off: { e: -120, n: -275 }, note: 'Corner table by the window is the good one.' },
  { id: 'pl2', name: 'The lake walk', kind: 'Outdoors · Evenings', hue: 196, off: { e: -900, n: 1080 }, note: 'Busiest after six, quiet at sunrise.' },
  { id: 'pl3', name: 'The main market', kind: 'Market · Everything', hue: 36, off: { e: -1600, n: -1200 }, note: 'Go early. Bring cash and patience.' },
  { id: 'pl4', name: 'The five-a-side pitch', kind: 'Sport · Nightly games', hue: 140, off: { e: 400, n: 300 }, note: 'Lights stay on until ten.' },
  { id: 'pl5', name: 'The old park', kind: 'Park · Weekends', hue: 108, off: { e: 2400, n: -1450 }, note: 'Shade on the eastern path.' }
];

let connections = [
  { personId: 'p1', at: now() - 2 * 24 * HOUR },
  { personId: 'p2', at: now() - 1 * 24 * HOUR },
  { personId: 'p7', at: now() - 6 * 24 * HOUR },
  { personId: 'p5', at: now() - 21 * 24 * HOUR }
];
let connectionRequests = [
  { id: 'r1', personId: 'p3', message: 'Saw you shoot film too. I have a spare roll of Portra if you ever want to trade.', at: now() - 3 * HOUR },
  { id: 'r2', personId: 'p10', message: 'Visiting for two weeks and trying to find a running route. Any advice welcome.', at: now() - 26 * HOUR }
];

let notifications = [
  { id: 'n1', type: 'connect', text: '<b>Maya</b> connected with you.', at: now() - 25 * 60000, read: false },
  { id: 'n2', type: 'update', text: '<b>Alex</b> posted a Daily Update near you.', at: now() - 2.2 * HOUR, read: false },
  { id: 'n3', type: 'message', text: '<b>Ibrahim</b> sent you a message.', at: now() - 3 * HOUR, read: false },
  { id: 'n4', type: 'nearby', text: 'There are <b>4 active people</b> within 1 km of you.', at: now() - 5 * HOUR, read: true },
  { id: 'n5', type: 'expiry', text: 'Your Daily Update expires in about 4 hours.', at: now() - 6 * HOUR, read: true },
  { id: 'n6', type: 'request', text: '<b>Tomi</b> wants to connect with you.', at: now() - 3 * HOUR, read: false }
];

let conversations = [
  {
    id: 'c_p1', personId: 'p1', unread: 0, messages: [
      { me: false, text: 'That security talk you mentioned — is it open to anyone?', at: now() - 26 * HOUR },
      { me: true, text: 'It is. I will send you the details tonight.', at: now() - 25.5 * HOUR },
      { me: false, text: 'Perfect. Also I am at Neo if you are around later.', at: now() - 40 * 60000 }
    ]
  },
  {
    id: 'c_p2', personId: 'p2', unread: 2, messages: [
      { me: false, text: 'Are you free Saturday morning?', at: now() - 3.2 * HOUR },
      { me: false, text: 'I want to pair on the booking thing before I lose interest in it', at: now() - 3 * HOUR }
    ]
  },
  {
    id: 'c_p7', personId: 'p7', unread: 0, messages: [
      { me: true, text: 'Save me a seat at the window?', at: now() - 5 * HOUR },
      { me: false, text: 'Always. Beans just came out of the roaster.', at: now() - 4.8 * HOUR }
    ]
  }
];

/* Moonflower — private, never leaves this device in the demo */
let moonNotes = [
  { id: 'mn1', at: now() - 20 * HOUR, text: 'Told Maya about the studio idea out loud for the first time. It sounded less ridiculous than it does in my head.' },
  { id: 'mn2', at: now() - 3 * 24 * HOUR, text: 'Slept badly. Walked instead of taking the car and the whole day was better for it. Remember that.' }
];
let moonGoals = [
  { id: 'g1', title: 'Ship the security audit toolkit', sub: 'Personal project · by December', steps: [{ t: 'Write the scanner core', done: true }, { t: 'Add report export', done: true }, { t: 'Write the docs', done: false }, { t: 'Publish v0.1', done: false }] },
  { id: 'g2', title: 'Run 5km without stopping', sub: 'Three mornings a week', steps: [{ t: 'Two runs a week for a month', done: true }, { t: 'Reach 3km', done: false }, { t: 'Reach 5km', done: false }] }
];
let moonReminders = [
  { id: 'rm1', text: 'Call home on Sunday', when: 'Sunday, 6pm', done: false },
  { id: 'rm2', text: 'Renew the domain', when: 'Friday', done: false },
  { id: 'rm3', text: 'Send Maya the talk details', when: 'Tonight', done: true }
];
let moonChat = [
  { me: false, text: 'Hello Connell. Nothing here is shared with anyone. What is on your mind tonight?', at: now() - 26 * HOUR }
];

/* ------------------------------------------------------------
   APP STATE
------------------------------------------------------------ */
const state = {
  tab: 'home',
  stack: [],
  loaded: { home: false, discover: false, nearby: false, profile: false },
  discoverFilter: 'all',
  radius: 2,
  locStatus: 'unknown',   // unknown | requesting | granted | denied | unavailable | timeout
  userLocation: null,      // exact device fix — internal only, never rendered
  geo: { locality: '', district: '', city: '', region: '', country: '', postcode: '' }, // derived from the fix
  geoWatchId: null,
  activeChat: null,
  activePerson: null,
  moonRoom: null,
  searchQuery: '',
  sheetCtx: null
};

/* ------------------------------------------------------------
   RENDERING ATOMS
------------------------------------------------------------ */
function avatarStyle(hue) {
  return `background:linear-gradient(145deg,hsl(${hue} 42% 66%),hsl(${(hue + 340) % 360} 40% 40%))`;
}
function avatar(p, size = 44, opts = {}) {
  const st = p.status ? `<span class="status ${p.status}"></span>` : '';
  return `<span class="av av--${size}" style="${avatarStyle(p.hue)}" aria-hidden="true">${initials(p.short || p.name)}${opts.status === false ? '' : st}</span>`;
}
function ringAvatar(p, size = 56, live = false) {
  return `<span class="av-ring ${live ? 'live' : ''}">${avatar(p, size)}</span>`;
}
function kindPill(kind) {
  const k = KINDS[kind] || KINDS.general;
  return `<span class="kind ${k.cls}">${k.label}</span>`;
}
function sectionHead(title, hint, action) {
  return `<div class="section-head"><h2>${esc(title)}</h2>${action ? `<button data-action="${action.a}">${esc(action.t)}</button>` : hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
}
function emptyState(title, body, cta) {
  return `<div class="empty"><div class="mark"></div><h3>${esc(title)}</h3><p>${esc(body)}</p>${cta ? `<button class="btn btn--soft" data-action="${cta.a}">${esc(cta.t)}</button>` : ''}</div>`;
}
function skeletonCards(n = 3) {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<div class="sk-card">
      <div class="sk-row"><div class="sk sk-circle" style="width:38px;height:38px"></div>
      <div style="flex:1"><div class="sk sk-line" style="width:42%"></div><div class="sk sk-line" style="width:26%;margin-top:7px;height:9px"></div></div></div>
      <div class="sk sk-line" style="width:76%;margin-top:14px;height:14px"></div>
      <div class="sk sk-line" style="width:96%;margin-top:9px"></div>
      <div class="sk sk-line" style="width:60%;margin-top:7px"></div>
    </div>`;
  }
  return out;
}
function skeletonRail() {
  let out = '<div class="rail">';
  for (let i = 0; i < 4; i++) {
    out += `<div class="pcard"><div class="sk sk-circle" style="width:56px;height:56px;margin:0 auto"></div>
      <div class="sk sk-line" style="width:70%;margin:12px auto 0"></div>
      <div class="sk sk-line" style="width:88%;margin:7px auto 0;height:9px"></div></div>`;
  }
  return out + '</div>';
}

/* ------------------------------------------------------------
   NAVIGATION
------------------------------------------------------------ */
const nav = $('#nav');
const fab = $('#fab');

function setTab(tab, opts = {}) {
  if (state.stack.length) closeAllStacks();
  state.tab = tab;
  $$('.screen[data-tab]').forEach(s => s.classList.toggle('is-active', s.dataset.tab === tab));
  $$('#nav button').forEach(b => {
    const on = b.dataset.nav === tab;
    b.classList.toggle('is-on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  fab.classList.toggle('hidden', tab === 'moonflower' || tab === 'profile');
  const scroller = $(`#screen-${tab} .scroll`);
  if (scroller && !opts.keepScroll) scroller.scrollTop = 0;
  ensureLoaded(tab);
}

function ensureLoaded(tab) {
  if (tab === 'home' && !state.loaded.home) return loadHome();
  if (tab === 'discover' && !state.loaded.discover) return loadDiscover();
  if (tab === 'nearby' && !state.loaded.nearby) return loadNearby();
  if (tab === 'profile' && !state.loaded.profile) { state.loaded.profile = true; renderProfile(); }
  if (tab === 'moonflower') renderMoonflower();
}

function pushStack(id) {
  const scr = document.getElementById('screen-' + id);
  if (!scr) return;
  if (!state.stack.includes(id)) state.stack.push(id);
  scr.classList.add('is-active');
  nav.classList.toggle('hidden', !scr.classList.contains('has-nav'));
  fab.classList.add('hidden');
  const sc = scr.querySelector('.scroll');
  if (sc) sc.scrollTop = 0;
}
function popStack() {
  const id = state.stack.pop();
  if (id) document.getElementById('screen-' + id).classList.remove('is-active');
  const top = state.stack[state.stack.length - 1];
  const topScreen = top ? document.getElementById('screen-' + top) : null;
  nav.classList.toggle('hidden', !!topScreen && !topScreen.classList.contains('has-nav'));
  fab.classList.toggle('hidden', !!top || state.tab === 'moonflower' || state.tab === 'profile');
}
function closeAllStacks() {
  while (state.stack.length) popStack();
}

/* Scroll-aware top bars */
$$('.scroll[data-scroll]').forEach(sc => {
  sc.addEventListener('scroll', () => {
    const bar = sc.parentElement.querySelector('.topbar');
    if (bar) bar.classList.toggle('is-scrolled', sc.scrollTop > 6);
  }, { passive: true });
});

/* ------------------------------------------------------------
   LOCATION
   Device-derived only. There is no manual location input anywhere
   in this app: the user can allow or deny, nothing else.
   state.userLocation holds the exact fix and is used internally
   for distance maths. It is never rendered into the DOM.
------------------------------------------------------------ */
const GEO_OPTS = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
const EARTH_R = 6371;                 // km
const REFRESH_MOVE_M = 60;            // re-render after this much movement

function haversineKm(a, b) {
  const rad = d => d * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}
/* metres east/north -> absolute coordinates, used to place demo peers
   relative to the real device fix. Replace with rows from the backend. */
function offsetToCoords(origin, off) {
  const dLat = (off.n / 1000) / 110.574;
  const dLng = (off.e / 1000) / (111.320 * Math.cos(origin.latitude * Math.PI / 180) || 1);
  return { latitude: origin.latitude + dLat, longitude: origin.longitude + dLng };
}

function hasLocation() { return state.locStatus === 'granted' && !!state.userLocation; }

/* Public-facing label. Coarse by design — never a coordinate. */
function areaLabel() {
  return state.geo.locality || (hasLocation() ? 'Your area' : 'Location off');
}

function locationLine() {
  switch (state.locStatus) {
    case 'granted': return {
      title: 'Location enabled',
      sub: state.geo.locality ? `${state.geo.locality} · from your device` : 'Reading your area…'
    };
    case 'requesting': return { title: 'Getting your location…', sub: 'Your device is finding a fix' };
    case 'denied': return { title: 'Location is off', sub: 'Turn on location access to discover people nearby' };
    case 'unavailable': return { title: 'Location unavailable', sub: 'Your device could not provide a position' };
    case 'timeout': return { title: 'Location timed out', sub: 'Move somewhere with a clearer signal and try again' };
    default: return { title: 'Location is off', sub: 'Turn on location access to discover people nearby' };
  }
}

/* --- permission bootstrap: re-acquire silently if already granted --- */
async function initLocation() {
  if (!('geolocation' in navigator)) {
    state.locStatus = 'unavailable';
    refreshLocationUI();
    return;
  }
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const st = await navigator.permissions.query({ name: 'geolocation' });
      applyPermissionState(st.state);
      st.onchange = () => applyPermissionState(st.state);
      return;
    } catch (_) { /* fall through */ }
  }
  refreshLocationUI();
}

function applyPermissionState(perm) {
  if (perm === 'granted') { requestLocation(); }
  else if (perm === 'denied') { state.locStatus = 'denied'; stopWatching(); refreshLocationUI(); }
  else { state.locStatus = 'unknown'; refreshLocationUI(); }
}

function requestLocation(then) {
  if (!('geolocation' in navigator)) {
    state.locStatus = 'unavailable';
    toast('This device cannot provide a location', 'x');
    refreshLocationUI(); if (then) then(); return;
  }
  state.locStatus = 'requesting';
  refreshLocationUI();
  navigator.geolocation.getCurrentPosition(
    pos => { acceptFix(pos, true); if (then) then(); },
    err => { handleGeoError(err); if (then) then(); },
    GEO_OPTS
  );
}

/* Keep the fix current instead of freezing it at first use. */
function startWatching() {
  if (state.geoWatchId !== null || !('geolocation' in navigator)) return;
  state.geoWatchId = navigator.geolocation.watchPosition(
    pos => acceptFix(pos, false),
    err => handleGeoError(err),
    GEO_OPTS
  );
}
function stopWatching() {
  if (state.geoWatchId === null) return;
  navigator.geolocation.clearWatch(state.geoWatchId);
  state.geoWatchId = null;
}

function acceptFix(pos, announce) {
  const c = pos.coords;
  const prev = state.userLocation;
  state.userLocation = {
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy: c.accuracy,
    altitude: c.altitude,
    altitudeAccuracy: c.altitudeAccuracy,
    heading: c.heading,
    speed: c.speed,
    timestamp: pos.timestamp
  };
  state.locStatus = 'granted';
  applyGeoToPeers();
  startWatching();

  const movedKm = prev ? haversineKm(prev, state.userLocation) : Infinity;
  if (announce || movedKm * 1000 > REFRESH_MOVE_M) {
    refreshLocationUI();
    resolveArea();
  }
  if (announce) toast('Location on — your coordinates stay on your device', 'shield');
}

function handleGeoError(err) {
  if (err.code === 1) { state.locStatus = 'denied'; stopWatching(); }
  else if (err.code === 3) state.locStatus = 'timeout';
  else state.locStatus = 'unavailable';
  state.userLocation = null;
  state.geo = { locality: '', district: '', city: '', region: '', country: '', postcode: '' };
  toast(locationLine().title, 'pin');
  refreshLocationUI();
}

/* --- reverse geocoding: readable place names are DERIVED from the fix --- */
async function resolveArea() {
  if (!hasLocation()) return;
  const { latitude, longitude } = state.userLocation;
  const stamp = state.userLocation.timestamp;
  try {
    const ctrl = new AbortController();
    const kill = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${latitude}&lon=${longitude}`,
      { signal: ctrl.signal, headers: { 'Accept': 'application/json' } }
    );
    clearTimeout(kill);
    if (!res.ok) throw new Error('geocoder ' + res.status);
    const d = await res.json();
    if (state.userLocation && state.userLocation.timestamp !== stamp) return; // stale
    const a = d.address || {};
    state.geo = {
      locality: a.neighbourhood || a.suburb || a.city_district || a.town || a.village || a.city || a.county || 'Your area',
      district: a.city_district || a.suburb || '',
      city: a.city || a.town || a.village || a.county || '',
      region: a.state || '',
      country: a.country || '',
      postcode: a.postcode || ''
    };
  } catch (_) {
    // Offline or geocoder unavailable: fall back to a generic label.
    state.geo = { locality: 'Your area', district: '', city: '', region: '', country: '', postcode: '' };
  }
  refreshLocationUI();
}

/* --- proximity: every distance comes from coordinates --- */
function applyGeoToPeers() {
  if (!hasLocation()) {
    people.forEach(p => { p.coords = null; p.km = null; });
    activities.forEach(a => { a.coords = null; a.km = null; });
    places.forEach(pl => { pl.coords = null; pl.km = null; });
    return;
  }
  const me = state.userLocation;
  const attach = o => {
    o.coords = offsetToCoords(me, o.off);
    o.km = haversineKm(me, o.coords);
  };
  people.forEach(attach);
  activities.forEach(attach);
  places.forEach(attach);
}

function refreshLocationUI() {
  applyGeoToPeers();
  renderHomeLocation();
  const sub = $('#discover-sub');
  if (sub) sub.textContent = hasLocation() ? `Around ${areaLabel()}` : 'Location off · distances hidden';
  if (state.loaded.home) { renderHomePeople(); renderHomeOpps(); }
  if (state.loaded.discover) renderDiscover();
  if (state.loaded.nearby) renderNearby();
  if (state.loaded.profile) renderProfile();
}

/* ------------------------------------------------------------
   HOME
------------------------------------------------------------ */
async function loadHome() {
  state.loaded.home = true;
  $('#home-people').innerHTML = sectionHead('People nearby', 'Approximate') + skeletonRail();
  $('#home-feed').innerHTML = sectionHead('Daily Updates', 'Gone in 24 hours') + skeletonCards(2);
  renderHomeLocation();
  await sleep(620);
  renderHome();
}

function renderHome() {
  $('#greeting').textContent = `${greetWord()}, ${currentUser.name.split(' ')[0]}`;
  $('#home-avatar').innerHTML = avatar(currentUser, 44, { status: false });
  renderHomeLocation();
  renderHomePeople();
  renderHomeFeed();
  renderHomeOpps();
  updateNotifDot();
}

function renderHomeLocation() {
  const host = $('#home-loc');
  if (!host) return;
  const l = locationLine();
  const on = state.locStatus === 'granted';
  host.innerHTML = `<div class="locbar">
    ${on ? '<span class="pulse-dot"></span>' : icon('pin')}
    <span class="txt"><b>${esc(l.title)}</b> <span>· ${esc(l.sub)}</span></span>
    ${on ? '' : `<button data-action="enable-location">${state.locStatus === 'requesting' ? 'Finding…' : 'Turn on'}</button>`}
  </div>`;
}

function renderHomePeople() {
  if (!hasLocation()) {
    $('#home-people').innerHTML = sectionHead('People nearby') +
      emptyState(locationLine().title, 'Ming finds people using your device location. Turn on location access to see who is around you.',
        state.locStatus === 'denied' ? null : { t: 'Turn on location', a: 'enable-location' });
    return;
  }
  const near = people.filter(p => p.km !== null && p.km <= 3).sort((a, b) => a.km - b.km);
  $('#home-people').innerHTML = sectionHead('People nearby', null, { t: 'See all', a: 'go-nearby' }) +
    `<div class="rail">${near.map(p => `
      <button class="pcard" data-action="person:${p.id}">
        ${ringAvatar(p, 56, p.status === 'on')}
        <div class="name">${esc(p.short)}</div>
        <div class="tag">${esc(p.tag.split(' · ')[0])}</div>
        <div class="dist">${esc(distLabel(p.km))}</div>
      </button>`).join('')}</div>`;
}

function renderHomeFeed() {
  const list = liveUpdates().slice(0, 6);
  $('#home-feed').innerHTML = sectionHead('Daily Updates', 'Gone in 24 hours') +
    (list.length ? list.map(updateCard).join('') :
      emptyState('Nothing shared yet today', 'Daily Updates disappear after 24 hours. Be the first to say what you are up to.', { t: 'Share an update', a: 'create:update' }));
}

function renderHomeOpps() {
  $('#home-opps').innerHTML = sectionHead('Possibilities near you', 'Local') +
    `<div class="rail">${opportunities.slice(0, 4).map(o => {
      const p = byId(o.authorId);
      return `<button class="ocard" data-action="person:${o.authorId}">
        <div class="k">${esc(o.kind)}</div>
        <h3>${esc(o.title)}</h3>
        <p>${esc(o.body)}</p>
        <div class="f">${avatar(p, 28, { status: false })}<span>${esc(p.short)} · ${esc(distLabel(p.km))}</span></div>
      </button>`;
    }).join('')}</div>`;
}

/* ------------------------------------------------------------
   DAILY UPDATES
------------------------------------------------------------ */
function liveUpdates() {
  return dailyUpdates.filter(u => hoursLeft(u) > 0).sort((a, b) => b.createdAt - a.createdAt);
}

function updateCard(u) {
  const p = u.authorId === currentUser.id ? currentUser : byId(u.authorId);
  const h = hoursLeft(u);
  const pct = Math.max(2, Math.round((h / 24) * 100));
  const mine = u.authorId === currentUser.id;
  return `<article class="upd" id="upd-${u.id}">
    <div class="upd-top">
      ${avatar(p, 36)}
      <div class="who">
        <div class="n">${esc(p.short || p.name)}</div>
        <div class="m">${esc(mine ? 'You' : distLabel(p.km))} · ${esc(timeAgo(u.createdAt))}</div>
      </div>
      ${kindPill(u.kind)}
    </div>
    <h3>${esc(u.title)}</h3>
    <p>${esc(u.body)}</p>
    <div class="upd-foot">
      <button class="act ${u.liked ? 'is-on' : ''}" data-action="like:${u.id}" aria-pressed="${u.liked}" aria-label="React to this update">
        ${icon('heart')}<span>${u.likes}</span>
      </button>
      <button class="act" data-action="comments:${u.id}" aria-label="Open replies">
        ${icon('chat')}<span>${u.comments.length}</span>
      </button>
      ${mine ? `<button class="act" data-action="delete-update:${u.id}" aria-label="Delete update">${icon('trash')}</button>` : ''}
      <span class="expiry"><span class="life ${h < 4 ? 'low' : ''}"><i style="width:${pct}%"></i></span>${esc(lifeLabel(u))}</span>
    </div>
  </article>`;
}

function toggleLike(id) {
  const u = dailyUpdates.find(x => x.id === id);
  if (!u) return;
  u.liked = !u.liked;
  u.likes += u.liked ? 1 : -1;
  $$(`[data-action="like:${id}"]`).forEach(btn => {
    btn.classList.toggle('is-on', u.liked);
    btn.setAttribute('aria-pressed', String(u.liked));
    btn.querySelector('span').textContent = u.likes;
    btn.classList.remove('bump');
    void btn.offsetWidth;
    btn.classList.add('bump');
  });
}

function openComments(id) {
  const u = dailyUpdates.find(x => x.id === id);
  if (!u) return;
  state.sheetCtx = { type: 'comments', id };
  const body = u.comments.length ? u.comments.map(c => {
    const p = c.authorId === currentUser.id ? currentUser : byId(c.authorId);
    return `<div style="display:flex;gap:11px;padding:11px 0;border-top:1px solid var(--border)">
      ${avatar(p, 36)}
      <div><div style="font-size:13.5px;font-weight:560">${esc(p.short || p.name)} <span style="color:var(--muted);font-weight:400">· ${esc(timeAgo(c.at))}</span></div>
      <div style="font-size:14px;margin-top:3px;line-height:1.45">${esc(c.text)}</div></div>
    </div>`;
  }).join('') : `<p style="padding:18px 0;color:var(--muted);font-size:13.5px;text-align:center">No replies yet. Say something useful.</p>`;

  openSheet({
    title: u.title,
    sub: `${u.comments.length} ${u.comments.length === 1 ? 'reply' : 'replies'} · ${lifeLabel(u)}`,
    body,
    foot: `<form id="comment-form" style="display:flex;gap:9px;align-items:flex-end">
      <textarea id="comment-input" rows="1" placeholder="Write a reply" aria-label="Write a reply"
        style="flex:1;min-height:44px;max-height:100px;padding:11px 15px;border-radius:22px;border:1px solid var(--border);background:var(--bg);font-size:15px;resize:none;outline:none"></textarea>
      <button class="send" type="submit" aria-label="Post reply">${icon('send')}</button>
    </form>`
  });

  $('#comment-form').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#comment-input');
    const text = inp.value.trim();
    if (!text) return;
    u.comments.push({ id: uid('c'), authorId: currentUser.id, text, at: now() });
    inp.value = '';
    rerenderFeeds();
    openComments(id);
    toast('Reply posted', 'check');
  });
}

function deleteUpdate(id) {
  openModal({
    title: 'Delete this update?',
    lede: 'It would have disappeared on its own, but you can remove it now.',
    actions: [
      { t: 'Keep it', cls: 'btn--soft', a: 'close-modal' },
      { t: 'Delete', cls: 'btn--primary', a: 'confirm-delete:' + id }
    ]
  });
}

function createUpdate(kind, title, body) {
  dailyUpdates.unshift({
    id: uid('d'), authorId: currentUser.id, kind, title, body,
    createdAt: now(), likes: 0, liked: false, comments: []
  });
  rerenderFeeds();
  if (state.loaded.profile) renderProfile();
}

function rerenderFeeds() {
  if (state.loaded.home) { renderHomeFeed(); }
  if (state.loaded.discover) renderDiscover();
}

/* ------------------------------------------------------------
   DISCOVER
------------------------------------------------------------ */
const DISCOVER_FILTERS = [
  { k: 'all', t: 'Everything' },
  { k: 'people', t: 'People' },
  { k: 'moments', t: 'Moments' },
  { k: 'opps', t: 'Opportunities' },
  { k: 'activities', t: 'Activities' },
  { k: 'places', t: 'Places' },
  { k: 'visitors', t: 'Visitors' }
];

async function loadDiscover() {
  state.loaded.discover = true;
  $('#discover-chips').innerHTML = DISCOVER_FILTERS.map(f =>
    `<button class="chip ${f.k === state.discoverFilter ? 'is-on' : ''}" data-action="filter:${f.k}">${f.t}</button>`).join('');
  $('#discover-body').innerHTML = skeletonRail() + skeletonCards(2);
  await sleep(560);
  renderDiscover();
}

function renderDiscover() {
  $('#discover-chips').innerHTML = DISCOVER_FILTERS.map(f =>
    `<button class="chip ${f.k === state.discoverFilter ? 'is-on' : ''}" data-action="filter:${f.k}">${f.t}</button>`).join('');
  const f = state.discoverFilter;
  const show = k => f === 'all' || f === k;
  let html = '';

  if (show('people')) {
    html += `<div class="section">${sectionHead('People', null, { t: 'Nearby', a: 'go-nearby' })}
      <div class="rail">${people.filter(p => !p.visitor).map(p => `
        <button class="pcard" data-action="person:${p.id}">
          ${ringAvatar(p, 56, p.status === 'on')}
          <div class="name">${esc(p.short)}</div>
          <div class="tag">${esc(p.tag)}</div>
          <div class="dist">${esc(distLabel(p.km))}</div>
        </button>`).join('')}</div></div>`;
  }

  if (show('moments')) {
    html += `<div class="section">${sectionHead('Moments', 'Happening now')}
      <div class="rail">${moments.map(m => {
        const p = byId(m.authorId);
        return `<button class="mcard" data-action="person:${m.authorId}">
          <div class="art" style="background:linear-gradient(160deg,hsl(${m.hue} 38% 82%),hsl(${(m.hue + 330) % 360} 34% 58%))">
            <span class="who">${avatar(p, 28, { status: false })}${esc(p.short)}</span>
          </div>
          <div class="body"><p>${esc(m.text)}</p><div class="m">${esc(m.ago)} · ${esc(distLabel(p.km))}</div></div>
        </button>`;
      }).join('')}</div></div>`;
  }

  if (show('opps')) {
    html += `<div class="section">${sectionHead('Opportunities', 'People looking, people offering')}
      <div class="rail">${opportunities.map(o => {
        const p = byId(o.authorId);
        return `<button class="ocard" data-action="person:${o.authorId}">
          <div class="k">${esc(o.kind)}</div><h3>${esc(o.title)}</h3><p>${esc(o.body)}</p>
          <div class="f">${avatar(p, 28, { status: false })}<span>${esc(p.short)} · ${esc(distLabel(p.km))}</span></div>
        </button>`;
      }).join('')}</div></div>`;
  }

  if (show('activities')) {
    html += `<div class="section">${sectionHead('Activities', 'Things happening nearby')}
      ${activities.map(a => {
        const p = byId(a.hostId);
        return `<button class="acard" data-action="activity:${a.id}">
          <div class="when"><div class="h">${esc(a.hour)}</div><div class="d">${esc(a.day)}</div></div>
          <div class="info"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.place)} · ${esc(distLabel(a.km))} · ${a.going} going</div></div>
          <span class="go">${icon('chev')}</span>
        </button>`;
      }).join('')}</div>`;
  }

  if (show('places')) {
    html += `<div class="section">${sectionHead('Places', 'Worth the walk')}
      <div class="rail">${places.map(pl => `
        <button class="plcard" data-action="place:${pl.id}">
          <div class="art" style="background:linear-gradient(155deg,hsl(${pl.hue} 34% 84%),hsl(${(pl.hue + 20) % 360} 28% 62%))"></div>
          <div class="body"><div class="n">${esc(pl.name)}</div><div class="s">${esc(pl.kind)}</div>
          <div class="d">${esc(distLabel(pl.km))}</div></div>
        </button>`).join('')}</div></div>`;
  }

  if (show('visitors')) {
    const vs = people.filter(p => p.visitor);
    html += `<div class="section">${sectionHead('Visitors', 'New to the area')}
      ${vs.length ? vs.map(p => `
        <button class="prow" data-action="person:${p.id}">
          ${avatar(p, 48)}
          <div class="meta"><div class="n">${esc(p.name)}</div><div class="s">${esc(p.bio)}</div></div>
          <div class="right"><div class="d">${esc(distLabel(p.km))}</div><div class="t">${esc(areaLabel())}</div></div>
        </button>`).join('') : emptyState('No visitors right now', 'When someone new arrives in your area, they will show up here.')}
      </div>`;
  }

  $('#discover-body').innerHTML = html;
}

/* ------------------------------------------------------------
   NEARBY
------------------------------------------------------------ */
async function loadNearby() {
  state.loaded.nearby = true;
  $('#nearby-body').innerHTML = `<div style="margin:0 18px"><div class="sk" style="height:330px;border-radius:var(--r-xl)"></div></div>` + skeletonCards(2);
  await sleep(640);
  renderNearby();
}

function renderNearby() {
  const host = $('#nearby-body');
  if (state.locStatus !== 'granted') {
    host.innerHTML = `
      <div class="perm">
        <div class="glyph">${icon('pin')}</div>
        <h3>${esc(locationLine().title === 'Location enabled' ? 'Turn on location' : locationLine().title)}</h3>
        <p>Ming works out where you are from your device. There is no way to type an area in — you either allow location access or you don't. Your coordinates stay on your device, and nobody else sees more than a rough distance.</p>
        <button class="btn btn--primary btn--block" data-action="enable-location">
          ${state.locStatus === 'requesting' ? 'Finding your area…' : 'Enable location'}
        </button>
        <p class="fine">You can browse Discover without sharing location.</p>
      </div>
      ${state.locStatus === 'denied' ? `<div class="privacy-note" style="margin-top:16px">${icon('shield')}<p>Location is blocked for this site. Allow it in your browser settings, then tap Enable location again.</p></div>` : ''}
      <div class="section">${sectionHead('While you wait', 'Public activity')}
        ${liveUpdates().slice(0, 2).map(updateCard).join('')}
      </div>`;
    return;
  }

  const inRange = people.filter(p => p.km !== null && p.km <= state.radius).sort((a, b) => a.km - b.km);
  const actPins = activities.filter(a => a.km !== null && a.km <= state.radius).slice(0, 2);
  /* Pin positions come from the offset between two coordinates — a picture of
     relative bearing, never a published coordinate. */
  const mapPos = o => {
    const k = 45 / Math.max(state.radius, 0.1);
    return {
      x: Math.min(93, Math.max(7, 50 + (o.off.e / 1000) * k)),
      y: Math.min(90, Math.max(8, 50 - (o.off.n / 1000) * k))
    };
  };

  host.innerHTML = `
    <div class="mapwrap">
      <div class="map" id="map">
        <div class="road h" style="top:32%"></div>
        <div class="road h" style="top:70%;height:9px"></div>
        <div class="road v" style="left:36%"></div>
        <div class="road v" style="left:72%;width:7px"></div>
        <div class="blk" style="left:6%;top:38%;width:24%;height:26%"></div>
        <div class="blk" style="left:42%;top:8%;width:24%;height:18%"></div>
        <div class="blk" style="left:78%;top:40%;width:18%;height:22%"></div>
        <div class="blk" style="left:8%;top:8%;width:20%;height:16%"></div>
        <div class="water"></div>
        <div class="ring r3"></div>
        <div class="ring r2"></div>
        <div class="ring r1"></div>
        <div class="ring r2 sweep"></div>
        <div class="me" aria-hidden="true"></div>
        <div class="map-float">${icon('shield')} ${esc(areaLabel())} · exact position hidden</div>
        ${inRange.map(p => `
          <button class="pin" style="left:${mapPos(p).x}%;top:${mapPos(p).y}%" data-action="person:${p.id}" aria-label="${esc(p.short)}, ${esc(distLabel(p.km))}">
            <span class="bubble">${avatar(p, 36)}</span><span class="tip"></span>
          </button>`).join('')}
        ${actPins.map(a => `
          <button class="pin activity" style="left:${mapPos(a).x}%;top:${mapPos(a).y}%" data-action="activity:${a.id}" aria-label="${esc(a.title)}">
            <span class="bubble">${esc(a.title.split(',')[0])} · ${esc(a.hour)}</span><span class="tip"></span>
          </button>`).join('')}
      </div>
      <div class="map-legend">${icon('users')}<span><b>${inRange.length} people</b> and ${actPins.length} activities within ${state.radius} km · measured from your device position</span></div>
    </div>

    <div class="radius-ctl">
      <div class="lbl"><b>Discovery area</b><span id="radius-val">${state.radius} km</span></div>
      <input type="range" id="radius" min="0.5" max="5" step="0.5" value="${state.radius}" aria-label="Discovery radius in kilometres" />
    </div>

    <div class="privacy-note">${icon('shield')}
      <p><b>Your exact location is hidden.</b> Ming only ever shows an approximate distance, and never your address or coordinates — to anyone.</p>
    </div>

    <div class="section">${sectionHead('People around you', inRange.length ? `${inRange.length} within ${state.radius} km` : null)}
      ${inRange.length ? inRange.map(p => `
        <button class="prow" data-action="person:${p.id}">
          ${ringAvatar(p, 48, p.status === 'on')}
          <div class="meta"><div class="n">${esc(p.name)}</div><div class="s">${esc(p.tag)} · ${esc(p.activity)}</div></div>
          <div class="right"><div class="d">${esc(distLabel(p.km))}</div><div class="t">${esc(areaLabel())}</div></div>
        </button>`).join('')
      : emptyState('No one nearby yet.', 'Check back soon, or expand your discovery area to see more of the neighbourhood.', { t: 'Expand to 5 km', a: 'expand-radius' })}
    </div>

    <div class="section">${sectionHead('Activity nearby', 'Next few days')}
      ${activities.filter(a => a.km !== null && a.km <= state.radius).map(a => `
        <button class="acard" data-action="activity:${a.id}">
          <div class="when"><div class="h">${esc(a.hour)}</div><div class="d">${esc(a.day)}</div></div>
          <div class="info"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.place)} · ${a.going} going</div></div>
          <span class="go">${icon('chev')}</span>
        </button>`).join('') || emptyState('Nothing planned nearby', 'Start something. People three streets away are probably free too.', { t: 'Create an activity', a: 'create:activity' })}
    </div>`;

  const slider = $('#radius');
  if (slider) {
    slider.addEventListener('input', e => {
      state.radius = parseFloat(e.target.value);
      $('#radius-val').textContent = state.radius + ' km';
    });
    slider.addEventListener('change', () => renderNearby());
  }
}

/* ------------------------------------------------------------
   PERSON
------------------------------------------------------------ */
function isConnected(id) { return connections.some(c => c.personId === id); }

function openPerson(id) {
  const p = byId(id);
  if (!p) return;
  state.activePerson = id;
  $('#person-title').textContent = p.short;
  const connected = isConnected(id);
  const theirUpdates = liveUpdates().filter(u => u.authorId === id);

  $('#person-body').innerHTML = `
    <div class="phead" style="padding-top:8px">
      ${ringAvatar(p, 88, p.status === 'on')}
      <div class="who">
        <h1>${esc(p.name)}</h1>
        <div class="u">${esc(p.tag)}</div>
        <div class="u" style="color:var(--coffee);margin-top:6px">${esc(distLabel(p.km))}${hasLocation() ? ' · ' + esc(areaLabel()) : ''}</div>
      </div>
    </div>
    <div class="pmeta"><p class="bio">${esc(p.bio)}</p></div>
    <div class="now">
      <div><div class="lbl">Right now</div><div class="val">${esc(p.activity)}</div></div>
    </div>
    <div style="display:flex;gap:10px;padding:18px 18px 0">
      <button class="btn ${connected ? 'btn--soft' : 'btn--primary'}" style="flex:1" data-action="${connected ? 'remove-conn:' + p.id : 'connect:' + p.id}">
        ${connected ? icon('check') + 'Connected' : icon('users') + 'Connect'}
      </button>
      <button class="btn btn--soft" style="flex:1" data-action="message:${p.id}">${icon('chat')}Message</button>
    </div>
    <div class="section">${sectionHead('Interests')}
      <div class="tags">${p.interests.map(i => `<span class="tag-pill">${esc(i)}</span>`).join('')}</div>
    </div>
    <div class="section">${sectionHead('Daily Updates', 'Gone in 24 hours')}
      ${theirUpdates.length ? theirUpdates.map(updateCard).join('') : emptyState('Nothing shared today', `${p.short} has not posted an update in the last 24 hours.`)}
    </div>
    <div class="privacy-note" style="margin-bottom:8px">${icon('shield')}
      <p>You are seeing an approximate distance. ${esc(p.short)} cannot see your exact location either.</p>
    </div>`;
  pushStack('person');
}

/* ------------------------------------------------------------
   CONNECTIONS
------------------------------------------------------------ */
function renderConnections() {
  $('#conn-sub').textContent = `${connections.length} people · ${connectionRequests.length} pending`;
  const reqs = connectionRequests.map(r => {
    const p = byId(r.personId);
    return `<div class="req" id="req-${r.id}">
      <div class="top">${avatar(p, 48)}
        <div class="m"><div class="n">${esc(p.name)}</div><div class="s">${esc(p.tag)} · ${esc(distLabel(p.km))}</div></div>
      </div>
      <p class="msg">${esc(r.message)}</p>
      <div class="row">
        <button class="btn btn--primary btn--sm" data-action="accept-req:${r.id}">Accept</button>
        <button class="btn btn--soft btn--sm" data-action="decline-req:${r.id}">Not now</button>
      </div>
    </div>`;
  }).join('');

  const list = connections.length ? connections
    .slice()
    .sort((a, b) => b.at - a.at)
    .map(c => {
      const p = byId(c.personId);
      const d = Math.round((now() - c.at) / (24 * HOUR));
      const when = d === 0 ? 'Connected today' : d === 1 ? 'Connected yesterday' : `Connected ${d} days ago`;
      return `<div class="conn-card">
        <button style="display:flex;gap:13px;flex:1;align-items:center;text-align:left" data-action="person:${p.id}">
          ${avatar(p, 48)}
          <span class="m"><span class="n" style="display:block">${esc(p.name)}</span>
          <span class="s" style="display:block">${esc(p.tag)}</span>
          <span class="w" style="display:block">${esc(when)}</span></span>
        </button>
        <div class="acts">
          <button class="round" data-action="message:${p.id}" aria-label="Message ${esc(p.short)}">${icon('chat')}</button>
          <button class="round" data-action="confirm-remove:${p.id}" aria-label="Remove ${esc(p.short)}">${icon('x')}</button>
        </div>
      </div>`;
    }).join('') : emptyState('No connections yet', 'When you connect with someone nearby, they will appear here.', { t: 'Discover people', a: 'go-nearby' });

  $('#connections-body').innerHTML =
    (connectionRequests.length ? `<div class="section" style="margin-top:14px">${sectionHead('Requests', `${connectionRequests.length} waiting`)}${reqs}</div>` : '') +
    `<div class="section">${sectionHead('Your connections', `${connections.length} people`)}${list}</div>`;
}

function connectWith(id) {
  const p = byId(id);
  if (!p || isConnected(id)) return;
  openModal({
    title: `Connect with ${p.short}?`,
    lede: 'Add a short note so they know why. Connections are mutual — either of you can remove it later.',
    fields: `<div class="field"><label for="conn-note">Your note</label>
      <textarea id="conn-note" placeholder="Hi ${esc(p.short)} — saw you are nearby…" maxlength="180"></textarea></div>`,
    actions: [
      { t: 'Cancel', cls: 'btn--soft', a: 'close-modal' },
      { t: 'Send request', cls: 'btn--primary', a: 'send-conn:' + id }
    ]
  });
}

function sendConnection(id) {
  const p = byId(id);
  connections.push({ personId: id, at: now() });
  notifications.unshift({ id: uid('n'), type: 'connect', text: `<b>${esc(p.short)}</b> accepted your connection request.`, at: now(), read: false });
  closeModal();
  toast(`Connected with ${p.short}`, 'check');
  updateNotifDot();
  if (state.activePerson === id) openPersonRefresh(id);
  renderConnections();
  if (state.loaded.profile) renderProfile();
}

function openPersonRefresh(id) {
  const scroll = $('#screen-person .scroll').scrollTop;
  state.stack.pop();
  openPerson(id);
  $('#screen-person .scroll').scrollTop = scroll;
}

/* ------------------------------------------------------------
   MESSAGING
------------------------------------------------------------ */
function convoFor(personId) {
  let c = conversations.find(x => x.personId === personId);
  if (!c) {
    c = { id: 'c_' + personId, personId, unread: 0, messages: [] };
    conversations.unshift(c);
  }
  return c;
}

function renderMessages() {
  const list = conversations.slice().sort((a, b) => {
    const la = a.messages.length ? a.messages[a.messages.length - 1].at : 0;
    const lb = b.messages.length ? b.messages[b.messages.length - 1].at : 0;
    return lb - la;
  });
  $('#messages-body').innerHTML = list.length ? list.map(c => {
    const p = byId(c.personId);
    const last = c.messages[c.messages.length - 1];
    return `<button class="convo ${c.unread ? 'unread' : ''}" data-action="chat:${c.personId}">
      ${avatar(p, 48)}
      <span class="c">
        <span class="top"><span class="n">${esc(p.short)}</span><span class="t">${last ? esc(timeAgo(last.at)) : ''}</span></span>
        <span class="p">${last ? (last.me ? 'You: ' : '') + esc(last.text) : 'Say hello'}</span>
      </span>
      ${c.unread ? `<span class="badge">${c.unread}</span>` : ''}
    </button>`;
  }).join('') : emptyState('No conversations yet.', 'Connect with someone nearby to start a conversation.', { t: 'Find people', a: 'go-nearby' });
}

function openChat(personId) {
  const p = byId(personId);
  const c = convoFor(personId);
  c.unread = 0;
  state.activeChat = personId;
  $('#chat-av').innerHTML = avatar(p, 36);
  $('#chat-name').textContent = p.short;
  $('#chat-sub').textContent = `${hasLocation() ? distLabel(p.km) + ' · ' : ''}${p.status === 'on' ? 'Active now' : 'Active earlier'}`;
  renderThread();
  pushStack('chat');
  setTimeout(() => { const t = $('#chat-thread'); t.scrollTop = t.scrollHeight; }, 60);
}

function renderThread() {
  const c = convoFor(state.activeChat);
  $('#chat-thread').innerHTML =
    `<div class="day-sep">Messages disappear only if you delete them</div>` +
    c.messages.map(m => `<div class="bub ${m.me ? 'me' : 'them'}">${esc(m.text)}<span class="time">${clockTime(m.at)}</span></div>`).join('');
}

function sendMessage(text) {
  const c = convoFor(state.activeChat);
  c.messages.push({ me: true, text, at: now() });
  renderThread();
  const t = $('#chat-thread');
  t.scrollTop = t.scrollHeight;

  const typing = document.createElement('div');
  typing.className = 'bub them';
  typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  setTimeout(() => {
    t.appendChild(typing);
    t.scrollTop = t.scrollHeight;
  }, 400);

  const p = byId(state.activeChat);
  const replies = [
    'Sounds good — I am around this evening.',
    'Ha, yes. Let me check and come back to you.',
    `I am about ${distLabel(p.km).replace(' away', '')} from you, so that works.`,
    'Send me the details and I will be there.',
    'Honestly, that is the best idea I have heard today.'
  ];
  setTimeout(() => {
    typing.remove();
    c.messages.push({ me: false, text: replies[Math.floor(Math.random() * replies.length)], at: now() });
    renderThread();
    t.scrollTop = t.scrollHeight;
  }, 1700);
}

/* ------------------------------------------------------------
   MOONFLOWER
------------------------------------------------------------ */
const MOON_ROOMS = {
  talk: { title: 'Talk to Me', sub: 'Private conversation', icon: 'spark' },
  journey: { title: 'My Journey', sub: 'Goals and plans', icon: 'target' },
  space: { title: 'My Space', sub: 'Notes and memories', icon: 'note' },
  reminders: { title: 'Reminders', sub: 'Things to hold onto', icon: 'alarm' }
};

/* Native actions rather than a command menu — each just seeds the
   input with a starting thought; the person still decides whether
   and how to send it. */
const MOON_INTENTS = {
  think: { label: 'Think', seed: 'Help me think through something: ' },
  plan: { label: 'Plan', seed: 'I want to plan ' },
  remember: { label: 'Remember', seed: 'Remember this: ' },
  explore: { label: 'Explore', seed: "I'm curious about " },
  reflect: { label: 'Reflect', seed: 'Something on my mind — ' },
  create: { label: 'Create', seed: "I'm trying to make " },
  organize: { label: 'Organize', seed: 'Help me get organized around ' }
};

function renderMoonflower() {
  if (window.MoonSky && !window.MoonSky.onEclipse) {
    // set once, the first time Moonflower is actually opened — moon-sky.js
    // loads after this file, so window.MoonSky doesn't exist at boot()
    window.MoonSky.onEclipse = () => {
      const was = $('#moon-quiet') ? $('#moon-quiet').textContent : '';
      $$('.moon').forEach(el => el.classList.add('is-eclipse'));
      const q = $('#moon-quiet');
      if (q) q.textContent = 'The sky has paused for a moment. Nothing here needs you to do anything.';
      setTimeout(() => {
        $$('.moon').forEach(el => el.classList.remove('is-eclipse'));
        if (q && state.tab === 'moonflower') renderMoonflower();
      }, 10000);
    };
  }
  $('#moon-title').textContent = `${greetWord()}, ${currentUser.name.split(' ')[0]}.`;
  $('#moon-grid').innerHTML = `
    <button class="moon-tile moon-glass" data-action="moon:journey">
      <span class="ic">${icon('target')}</span>
      <span class="t">My Journey</span><span class="s">${moonGoals.length} things you are working towards</span>
    </button>
    <button class="moon-tile moon-glass" data-action="moon:space">
      <span class="ic">${icon('note')}</span>
      <span class="t">My Space</span><span class="s">${moonNotes.length} notes, ${moonNotes.length === 1 ? 'one star' : moonNotes.length + ' stars'}</span>
    </button>
    <button class="moon-tile moon-glass" data-action="moon:reminders">
      <span class="ic">${icon('alarm')}</span>
      <span class="t">Reminders</span><span class="s">${moonReminders.filter(r => !r.done).length} still open</span>
    </button>
    <button class="moon-tile moon-glass" data-action="moon:talk">
      <span class="ic">${icon('spark')}</span>
      <span class="t">Talk to Me</span><span class="s">A conversation that stays here</span>
    </button>`;
  const pending = moonReminders.find(r => !r.done);
  $('#moon-quiet').innerHTML = pending
    ? `Quiet reminder — ${esc(pending.text.toLowerCase())}, ${esc(pending.when.toLowerCase())}. Nothing here is shared with anyone on Ming.`
    : 'Nothing pending. Nothing here is shared with anyone on Ming.';
}

function openMoonRoom(key) {
  const room = MOON_ROOMS[key];
  if (!room) return;
  state.moonRoom = key;
  $('#moonroom-title').textContent = room.title;
  $('#moonroom-sub').textContent = room.sub;
  const form = $('#moon-form');
  const actionBtn = $('#moonroom-action');
  form.hidden = key !== 'talk';
  actionBtn.hidden = key === 'talk' || key === 'space';
  actionBtn.setAttribute('aria-label', key === 'journey' ? 'Add a goal' : 'Add a reminder');
  renderMoonRoom();
  pushStack('moonroom');
  if (key === 'talk') setTimeout(() => { const s = $('#moonroom-scroll'); s.scrollTop = s.scrollHeight; }, 80);
}

/* deterministic-looking scatter for the constellation, stable per note id */
function constellationPos(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { x: 10 + (h % 82), y: 14 + ((h >> 8) % 72) };
}

function renderMoonRoom() {
  const key = state.moonRoom;
  const host = $('#moonroom-body');

  if (key === 'talk') {
    host.innerHTML = `
    <div class="moon-chips" role="group" aria-label="Ways to start">
      ${Object.entries(MOON_INTENTS).map(([k, v]) => `<button class="moon-chip" data-action="moon-intent:${k}">${esc(v.label)}</button>`).join('')}
    </div>
    <div style="padding:6px 16px 8px;display:flex;flex-direction:column;gap:8px">
      ${moonChat.map(m => `<div class="bub ${m.me ? 'me' : 'them'}">${esc(m.text)}<span class="time">${clockTime(m.at)}</span></div>`).join('')}
    </div>
    <p class="center-note">Private to you. Not stored on any server in this demo.</p>`;
    return;
  }

  if (key === 'journey') {
    host.innerHTML = `<div style="padding:10px 0 0">${moonGoals.length ? moonGoals.map(g => {
      const done = g.steps.filter(s => s.done).length;
      const pct = done / g.steps.length;
      const W = 300, cx = 8, cy = 30, cw = W - 40;
      const path = `M${cx},${cy} C${cx + cw * 0.3},${cy - 22} ${cx + cw * 0.7},${cy + 18} ${cx + cw},${cy - 4}`;
      // an eased point along the curve's general shape — a believable position
      // on the path rather than exact bezier arithmetic
      const approxY = cy - Math.sin(pct * Math.PI) * 14;
      return `<div class="orbit-goal moon-glass">
        <div class="t">${esc(g.title)}</div>
        <div class="s">${esc(g.sub)} · ${done} of ${g.steps.length} done</div>
        <svg class="track" viewBox="0 0 ${W} 56" preserveAspectRatio="none">
          <path class="track-path" d="${path}"/>
          <circle class="track-node" cx="${cx}" cy="${cy}" r="3"/>
          <circle class="track-target" cx="${cx + cw}" cy="${cy - 4}" r="6"/>
          <circle class="track-cur" cx="${cx + cw * pct}" cy="${approxY}" r="5"/>
        </svg>
        <div class="steps">${g.steps.map((s, i) => `
          <button class="check" aria-pressed="${s.done}" data-action="step:${g.id}:${i}">
            <span class="box">${icon('check')}</span><span class="lb">${esc(s.t)}</span>
          </button>`).join('')}</div>
      </div>`;
    }).join('') : emptyState('No trajectory set yet', 'Add the first thing you are working towards.', { t: 'Add a goal', a: 'moon-add' })}</div>`;
    return;
  }

  if (key === 'space') {
    const stars = moonNotes.map(n => {
      const p = constellationPos(n.id);
      return `<button class="cstar" style="left:${p.x}%;top:${p.y}%" data-action="open-note:${n.id}" aria-label="Memory from ${esc(timeAgo(n.at))}"></button>`;
    }).join('');
    host.innerHTML = `
      <div class="constellation">
        ${moonNotes.length ? stars : `<div class="cempty">Your sky is empty. Every note you write becomes a star here.</div>`}
      </div>
      <div class="log-composer moon-glass">
        <div class="date">${esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase())}</div>
        <h4>How was today?</h4>
        <textarea id="log-input" rows="2" placeholder="Write here…" maxlength="600"></textarea>
        <div class="row"><button id="log-save" disabled>Save privately</button></div>
      </div>
      <div id="log-entries">${moonNotes.map(logEntryRow).join('') || ''}</div>`;
    const ta = $('#log-input'), save = $('#log-save');
    ta.addEventListener('input', () => { save.disabled = !ta.value.trim(); });
    save.addEventListener('click', () => {
      const v = ta.value.trim();
      if (!v) return;
      moonNotes.unshift({ id: uid('mn'), at: now(), text: v, place: hasLocation() ? areaLabel() : null });
      ta.value = ''; save.disabled = true;
      renderMoonRoom(); renderMoonflower();
      if (window.MoonSky) window.MoonSky.pulse();
      toast('Saved to My Space', 'check');
    });
    return;
  }

  if (key === 'reminders') {
    const open = moonReminders.filter(r => !r.done).length;
    const W = 320, cy = 30, R = 22;
    const arc = moonReminders.map((r, i) => {
      const t = moonReminders.length > 1 ? i / (moonReminders.length - 1) : 0.5;
      const x = 30 + t * (W - 60);
      const y = cy - Math.sin(t * Math.PI) * R;
      return `<g class="body ${r.done ? 'done' : ''}"><circle cx="${x}" cy="${y}" r="4"/></g>`;
    }).join('');
    host.innerHTML = `
      <div class="orbit-strip"><svg viewBox="0 0 ${W} 60" preserveAspectRatio="none">
        <path class="ring" d="M20,30 Q160,${30 - R * 1.6} 300,30"/>${arc}
      </svg></div>
      <div style="padding:2px 18px 0">${moonReminders.length ? moonReminders.map(r => `
        <button class="check" aria-pressed="${r.done}" data-action="rem:${r.id}" style="border-bottom:1px solid var(--border)">
          <span class="box">${icon('check')}</span>
          <span class="lb">${esc(r.text)}</span>
          <span class="when">${esc(r.when)}</span>
        </button>`).join('') : emptyState('Nothing to remember', 'Add something small. Moonflower will keep it for you.', { t: 'Add a reminder', a: 'moon-add' })}</div>
      ${moonReminders.length ? `<p class="center-note">${open} still open</p>` : ''}`;
  }
}

function logEntryRow(n) {
  return `<div class="log-entry moon-glass" id="log-${n.id}">
    <div class="d">${esc(new Date(n.at).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(timeAgo(n.at))}${n.place ? ` · ${esc(n.place)}` : ''}</div>
    <p>${esc(n.text)}</p>
    <div class="del"><button class="btn btn--sm btn--danger" data-action="del-note:${n.id}">${icon('trash')}Delete</button></div>
  </div>`;
}

function moonAdd() {
  const key = state.moonRoom;
  if (key === 'journey') {
    openModal({
      title: 'Add a goal',
      lede: 'Break it into a few small steps you can actually tick off.',
      fields: `<div class="field"><label for="mf-goal">Goal</label><input id="mf-goal" type="text" placeholder="Run 5km without stopping" /></div>
        <div class="field"><label for="mf-sub">Timeframe</label><input id="mf-sub" type="text" placeholder="Three mornings a week" /></div>
        <div class="field"><label for="mf-steps">Steps, one per line</label><textarea id="mf-steps" placeholder="Two runs a week&#10;Reach 3km&#10;Reach 5km"></textarea></div>`,
      actions: [{ t: 'Cancel', cls: 'btn--soft', a: 'close-modal' }, { t: 'Add goal', cls: 'btn--primary', a: 'save-goal' }]
    });
  } else {
    openModal({
      title: 'Add a reminder',
      lede: 'Something small you do not want to lose.',
      fields: `<div class="field"><label for="mf-rem">Remember</label><input id="mf-rem" type="text" placeholder="Call home" /></div>
        <div class="field"><label for="mf-when">When</label><input id="mf-when" type="text" placeholder="Sunday, 6pm" /></div>`,
      actions: [{ t: 'Cancel', cls: 'btn--soft', a: 'close-modal' }, { t: 'Add reminder', cls: 'btn--primary', a: 'save-rem' }]
    });
  }
}

function moonReply(text) {
  const t = text.toLowerCase();
  if (t.includes('tomorrow') || t.includes('plan')) {
    return 'Let us keep tomorrow simple. One thing that matters, one thing that is easy, one thing for you. What is the one that matters?';
  }
  if (t.includes('tired') || t.includes('stress') || t.includes('hard') || t.includes('sad')) {
    return 'That sounds heavy. You do not have to solve it tonight. What would make the next hour a little kinder?';
  }
  if (t.includes('idea') || t.includes('build') || t.includes('project')) {
    return 'Say more about it. What would the smallest first version look like — something you could finish this week?';
  }
  if (t.endsWith('?')) {
    return 'Good question. Let us take it apart: what do you already know, and what are you actually deciding between?';
  }
  return 'Noted. I will keep that here. What else is on your mind?';
}

/* A small heuristic layer on top of moonReply — this is still a
   scripted demo, not a real model, but it acts on Moonflower's own
   data rather than only talking about it: it can store a memory,
   recall one, or offer to turn a deadline-shaped sentence into a
   Journey. Nothing here reaches outside the current session. */
function moonAct(text) {
  const t = text.toLowerCase();

  if (state.moonPendingJourney && /^\s*(yes|yeah|sure|please|do it|go ahead|ok(ay)?)\b/i.test(text)) {
    const title = state.moonPendingJourney;
    state.moonPendingJourney = null;
    moonGoals.unshift({ id: uid('g'), title, sub: 'Started from a conversation', steps: [{ t: 'Define the first concrete step', done: false }] });
    if (state.moonRoom === 'journey') renderMoonRoom();
    renderMoonflower();
    return `Done — "${title}" is in My Journey now.`;
  }
  state.moonPendingJourney = null;

  const remember = text.match(/remember (?:that |this[:,]?\s*)?(.+)/i);
  if (remember && remember[1].trim().length > 3) {
    let note = remember[1].trim().replace(/\.+$/, '');
    note = note.charAt(0).toUpperCase() + note.slice(1) + '.';
    moonNotes.unshift({ id: uid('mn'), at: now(), text: note, place: hasLocation() ? areaLabel() : null });
    renderMoonflower();
    if (state.moonRoom === 'space') renderMoonRoom();
    return `Kept — it's in My Space now${hasLocation() ? ', tagged near ' + areaLabel() : ''}.`;
  }

  const recall = t.match(/what was i (?:working (?:on|toward)|doing)[^\d]*(\d+)\s*(day|week|month)s?\s*ago/);
  if (recall) {
    const n = +recall[1], unit = recall[2];
    const span = unit === 'day' ? n * HOUR * 24 : unit === 'week' ? n * HOUR * 24 * 7 : n * HOUR * 24 * 30;
    const target = now() - span;
    const goal = moonGoals[moonGoals.length - 1];
    const note = moonNotes.filter(nt => nt.at <= target + HOUR * 24 * 3).sort((a, b) => Math.abs(a.at - target) - Math.abs(b.at - target))[0];
    const bits = [];
    if (goal) bits.push(`working toward "${goal.title}"`);
    if (note) bits.push(`you had written "${note.text.length > 64 ? note.text.slice(0, 64) + '…' : note.text}"`);
    if (bits.length) return `Around then you were ${bits.join(', and ')}.`;
    return "I don't have anything from that far back yet — Moonflower only remembers what you've told it.";
  }

  if (/\b(exam|deadline|interview|certification|test|assessment)\b/.test(t)) {
    state.moonPendingJourney = text.replace(/\.+$/, '');
    return `That sounds worth tracking properly rather than just saying out loud. Want me to set "${state.moonPendingJourney}" as a goal in My Journey?`;
  }

  return moonReply(text);
}

/* ------------------------------------------------------------
   PROFILE
------------------------------------------------------------ */
function renderProfile() {
  const mine = liveUpdates().filter(u => u.authorId === currentUser.id);
  $('#profile-body').innerHTML = `
    <div class="phead">
      ${ringAvatar(currentUser, 88, true)}
      <div class="who">
        <h1>${esc(currentUser.name)}</h1>
        <div class="u">${esc(currentUser.username)}</div>
        <div class="u" style="margin-top:6px;color:var(--coffee)">${esc(currentUser.headline)}</div>
      </div>
    </div>
    <div class="pmeta">
      <p class="bio">${esc(currentUser.bio)}</p>
      <div class="line">
        <span>${icon('pin')}${esc(hasLocation() ? areaLabel() : 'Location off')}</span>
        <span>${icon('case')}${esc(currentUser.tags.join(' · '))}</span>
      </div>
    </div>
    <div class="stats">
      <button data-action="go-connections"><div class="v">${connections.length}</div><div class="l">Connections</div></button>
      <button data-action="go-updates"><div class="v">${mine.length}</div><div class="l">Live updates</div></button>
      <button data-action="go-messages"><div class="v">${conversations.reduce((n, c) => n + c.unread, 0)}</div><div class="l">Unread</div></button>
    </div>
    <div class="now">
      <div><div class="lbl">Right now</div><div class="val">${esc(currentUser.activity)}</div></div>
      <button class="edit" data-action="edit-activity">Change</button>
    </div>
    <div style="display:flex;gap:10px;padding:18px 18px 0">
      <button class="btn btn--primary" style="flex:1" data-action="edit-profile">${icon('edit')}Edit profile</button>
      <button class="btn btn--soft" style="flex:1" data-action="go-connections">${icon('users')}Connections</button>
    </div>
    <div class="section">${sectionHead('Interests and services')}
      <div class="tags">${currentUser.interests.map(i => `<span class="tag-pill">${esc(i)}</span>`).join('')}</div>
    </div>
    <div class="section" id="my-updates">${sectionHead('Your Daily Updates', 'Gone in 24 hours')}
      ${mine.length ? mine.map(updateCard).join('') : emptyState('No live updates', 'Anything you share disappears after 24 hours. Nothing to maintain.', { t: 'Share an update', a: 'create:update' })}
    </div>
    <div class="section">${sectionHead('Your account')}
      <div class="menu-list">
        <button class="menu-item" data-action="go-messages">${icon('chat')}<span class="t">Messages</span><span class="go">${icon('chev')}</span></button>
        <button class="menu-item" data-action="go-notifications">${icon('bell')}<span class="t">Notifications</span><span class="go">${icon('chev')}</span></button>
        <button class="menu-item" data-sp="spaces">${icon('sp-store')}<span class="t">Your Spaces</span><span class="go">${icon('chev')}</span></button>
        <button class="menu-item" data-sp="wallet">${icon('sp-wallet')}<span class="t">Ming Wallet</span><span class="go">${icon('chev')}</span></button>
        <button class="menu-item" data-action="privacy">${icon('shield')}<span class="t">Location and privacy</span><span class="go">${icon('chev')}</span></button>
        <button class="menu-item" data-action="settings">${icon('settings')}<span class="t">Settings</span><span class="go">${icon('chev')}</span></button>
      </div>
      <p class="center-note">${esc(currentUser.joined)}</p>
    </div>`;
}

function usernameChangeAvailable() {
  if (!currentUser.usernameChangedAt) return true;

  const changedAt = new Date(currentUser.usernameChangedAt).getTime();
  if (!Number.isFinite(changedAt)) return true;

  const next = new Date(changedAt);
  next.setMonth(next.getMonth() + 3);

  return now() >= next.getTime();
}

function usernameNextChangeDate() {
  if (!currentUser.usernameChangedAt) return null;

  const changedAt = new Date(currentUser.usernameChangedAt).getTime();
  if (!Number.isFinite(changedAt)) return null;

  const next = new Date(changedAt);
  next.setMonth(next.getMonth() + 3);
  return next;
}

function editProfile() {
  const usernameLocked = !usernameChangeAvailable();
  const nextUsernameChange = usernameNextChangeDate();

  openModal({
    title: 'Edit profile',
    lede: 'Keep it human. People nearby see this before they see anything else.',
    fields: `
      <div class="field">
        <label for="ep-name">Name</label>
        <input id="ep-name" type="text" value="${esc(currentUser.name)}" />
      </div>

      <div class="field">
        <label for="ep-username">Username</label>
        <input id="ep-username" type="text" value="${esc(currentUser.username.replace(/^@/, ''))}" maxlength="30" ${usernameLocked ? 'disabled' : ''} />
        <div class="count">${usernameLocked && nextUsernameChange
          ? 'Username can be changed again on ' + nextUsernameChange.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) + '.'
          : 'You can change your username once every 3 months.'}</div>
      </div>

      <div class="field">
        <label for="ep-head">What you do</label>
        <input id="ep-head" type="text" value="${esc(currentUser.headline)}" />
      </div>

      <div class="field">
        <label for="ep-bio">Short bio</label>
        <textarea id="ep-bio" maxlength="220">${esc(currentUser.bio)}</textarea>
      </div>

      <div class="field">
        <label>Your area</label>
        <div style="padding:13px 14px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2);font-size:14.5px;color:var(--muted)">${esc(hasLocation() ? areaLabel() : 'Location off')}</div>
        <div class="count">Set by your device, not by you. Others only ever see a rounded distance.</div>
      </div>`,
    actions: [{ t: 'Cancel', cls: 'btn--soft', a: 'close-modal' }, { t: 'Save changes', cls: 'btn--primary', a: 'save-profile' }]
  });
}

/* ------------------------------------------------------------
   SEARCH
------------------------------------------------------------ */
let searchTimer = null;

function openSearch() {
  pushStack('search');
  renderSearch('idle');
  setTimeout(() => $('#search-input').focus(), 220);
}

function renderSearch(mode, q = '') {
  const host = $('#search-body');
  if (mode === 'idle') {
    host.innerHTML = `
      <div class="section" style="margin-top:14px">${sectionHead('Try searching for')}
        <div class="chips" style="flex-wrap:wrap">
          ${['photographer', 'football', 'coffee', 'developer', 'visiting', 'market'].map(t => `<button class="chip" data-action="search-term:${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="section">${sectionHead('People near you')}
        ${people.slice(0, 4).map(p => `
          <button class="prow" data-action="person:${p.id}">${avatar(p, 44)}
            <div class="meta"><div class="n">${esc(p.name)}</div><div class="s">${esc(p.tag)}</div></div>
            <div class="right"><div class="d">${esc(distLabel(p.km))}</div></div>
          </button>`).join('')}
      </div>`;
    return;
  }
  if (mode === 'loading') {
    host.innerHTML = `<div style="padding:18px 0">${skeletonCards(2)}</div>`;
    return;
  }

  const t = q.toLowerCase();
  const rp = people.filter(p => (p.name + p.tag + p.bio + p.interests.join(' ') + p.activity).toLowerCase().includes(t));
  const ru = liveUpdates().filter(u => (u.title + u.body + KINDS[u.kind].label).toLowerCase().includes(t));
  const ro = opportunities.filter(o => (o.kind + o.title + o.body).toLowerCase().includes(t));
  const ra = activities.filter(a => (a.title + a.place + a.day).toLowerCase().includes(t));
  const rl = places.filter(p => (p.name + p.kind + p.note).toLowerCase().includes(t));
  const total = rp.length + ru.length + ro.length + ra.length + rl.length;

  if (!total) {
    host.innerHTML = emptyState(`Nothing for "${q}"`, 'Try a shorter word, or widen your discovery area in Nearby.', { t: 'Open Nearby', a: 'go-nearby' });
    return;
  }

  let html = `<p class="center-note" style="text-align:left;padding:16px 18px 0">${total} results for "${esc(q)}"</p>`;

  if (rp.length) html += `<div class="res-group"><div class="gh">People</div>${rp.map(p => `
    <button class="prow" data-action="person:${p.id}">${avatar(p, 44)}
      <div class="meta"><div class="n">${esc(p.name)}</div><div class="s">${esc(p.tag)}</div></div>
      <div class="right"><div class="d">${esc(distLabel(p.km))}</div></div></button>`).join('')}</div>`;

  if (ru.length) html += `<div class="res-group"><div class="gh">Daily Updates</div>${ru.map(updateCard).join('')}</div>`;

  if (ro.length) html += `<div class="res-group"><div class="gh">Opportunities</div><div class="rail">${ro.map(o => {
    const p = byId(o.authorId);
    return `<button class="ocard" data-action="person:${o.authorId}"><div class="k">${esc(o.kind)}</div><h3>${esc(o.title)}</h3>
      <p>${esc(o.body)}</p><div class="f">${avatar(p, 28, { status: false })}<span>${esc(p.short)}</span></div></button>`;
  }).join('')}</div></div>`;

  if (ra.length) html += `<div class="res-group"><div class="gh">Activities</div>${ra.map(a => `
    <button class="acard" data-action="activity:${a.id}">
      <div class="when"><div class="h">${esc(a.hour)}</div><div class="d">${esc(a.day)}</div></div>
      <div class="info"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.place)} · ${a.going} going</div></div>
      <span class="go">${icon('chev')}</span></button>`).join('')}</div>`;

  if (rl.length) html += `<div class="res-group"><div class="gh">Places</div><div class="rail">${rl.map(pl => `
    <button class="plcard" data-action="place:${pl.id}">
      <div class="art" style="background:linear-gradient(155deg,hsl(${pl.hue} 34% 84%),hsl(${(pl.hue + 20) % 360} 28% 62%))"></div>
      <div class="body"><div class="n">${esc(pl.name)}</div><div class="s">${esc(pl.kind)}</div><div class="d">${esc(distLabel(pl.km))}</div></div>
    </button>`).join('')}</div></div>`;

  host.innerHTML = html + '<div class="spacer"></div>';
}

/* ------------------------------------------------------------
   NOTIFICATIONS
------------------------------------------------------------ */
const NOTIF_ICON = { connect: 'users', update: 'spark', message: 'chat', nearby: 'pin', expiry: 'clock', request: 'users' };

function renderNotifications() {
  const host = $('#notif-body');
  host.innerHTML = notifications.length ? notifications.map(n => `
    <button class="notif" data-action="notif:${n.id}">
      <span class="ic">${icon(NOTIF_ICON[n.type] || 'bell')}</span>
      <span class="c"><span class="t" style="display:block">${n.text}</span><span class="ti" style="display:block">${esc(timeAgo(n.at))}</span></span>
      ${n.read ? '' : '<span class="unread-dot"></span>'}
    </button>`).join('') : emptyState("You're all caught up.", 'New connections, nearby activity and messages will show up here.');
}

function updateNotifDot() {
  const unread = notifications.some(n => !n.read);
  $('#notif-dot').hidden = !unread;
}

/* ------------------------------------------------------------
   BOTTOM SHEETS
------------------------------------------------------------ */
const sheet = $('#sheet'), scrim = $('#scrim'), modal = $('#modal');

function openSheet({ title, sub, body, foot }) {
  $('#sheet-head').innerHTML = `<h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}`;
  $('#sheet-body').innerHTML = body || '';
  $('#sheet-foot').innerHTML = foot || '';
  sheet.classList.add('is-open');
  scrim.classList.add('is-open');
}
function closeSheet() {
  sheet.classList.remove('is-open');
  if (!modal.classList.contains('is-open')) scrim.classList.remove('is-open');
}

const CREATE_OPTIONS = [
  { k: 'update', ic: 'spark', t: 'Daily Update', s: 'Share something happening now' },
  { k: 'activity', ic: 'cal', t: 'Activity', s: 'Invite people to do something' },
  { k: 'help', ic: 'hand', t: 'Need Help', s: 'Ask people nearby for something' },
  { k: 'offer', ic: 'gift', t: 'Offer', s: 'A service, an item, an opportunity' },
  { k: 'visitor', ic: 'plane', t: 'Visitor', s: "Tell people you're visiting the area" },
  { k: 'space', ic: 'sp-store', t: 'Space', s: 'A private world for one part of your life' }
];

function openCreateSheet() {
  openSheet({
    title: 'Share something',
    sub: 'Everything you post disappears after 24 hours.',
    body: CREATE_OPTIONS.map(o => `
      <button class="opt" data-action="create:${o.k}">
        <span class="ic">${icon(o.ic)}</span>
        <span class="tx"><span class="t" style="display:block">${o.t}</span><span class="s" style="display:block">${o.s}</span></span>
        <span class="go">${icon('chev')}</span>
      </button>`).join('')
  });
}

const CREATE_PRESETS = {
  update: { kind: 'general', title: 'Daily Update', ph: 'What is happening right now?', body: 'Anything worth saying to the people around you.', kinds: ['general', 'service', 'sale', 'talk', 'alert'] },
  activity: { kind: 'activity', title: 'Start an activity', ph: 'Football at the pitch down the road, 7pm', body: 'Where, when, and how many people you need.', kinds: ['activity'] },
  help: { kind: 'talk', title: 'Ask for help', ph: 'Need a photographer tomorrow morning', body: 'Say what you need and roughly when.', kinds: ['talk', 'hiring', 'alert'] },
  offer: { kind: 'service', title: 'Offer something', ph: 'Carpentry — shelving and repairs this week', body: 'What you are offering and who it is for.', kinds: ['service', 'sale', 'hiring'] },
  visitor: { kind: 'visitor', title: 'Say you are visiting', ph: 'New in town for ten days', body: 'What you are hoping to see, eat or find.', kinds: ['visitor'] }
};

function openComposer(type) {
  const preset = CREATE_PRESETS[type] || CREATE_PRESETS.update;
  state.sheetCtx = { type: 'compose', kind: preset.kind };
  openSheet({
    title: preset.title,
    sub: preset.body,
    body: `
      <div class="field"><label for="nu-title">Headline</label>
        <input id="nu-title" type="text" maxlength="70" placeholder="${esc(preset.ph)}" /></div>
      <div class="field"><label for="nu-body">Details</label>
        <textarea id="nu-body" maxlength="280" placeholder="A couple of lines is plenty."></textarea>
        <div class="count"><span id="nu-count">0</span>/280</div></div>
      ${preset.kinds.length > 1 ? `<div class="field"><label>Category</label>
        <div class="pick" id="nu-kinds">${preset.kinds.map(k => `
          <button type="button" data-kind="${k}" aria-pressed="${k === preset.kind}">${KINDS[k].label}</button>`).join('')}</div></div>` : ''}
      <div class="ephemeral-note">${icon('clock')}<span>This disappears in 24 hours. Nothing you post here becomes a permanent profile.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" id="nu-post" disabled>Share update</button>`
  });

  const title = $('#nu-title'), body = $('#nu-body'), post = $('#nu-post');
  const validate = () => { post.disabled = title.value.trim().length < 3; };
  title.addEventListener('input', validate);
  body.addEventListener('input', () => { $('#nu-count').textContent = body.value.length; });
  const kindsBox = $('#nu-kinds');
  if (kindsBox) {
    kindsBox.addEventListener('click', e => {
      const b = e.target.closest('button[data-kind]');
      if (!b) return;
      $$('button[data-kind]', kindsBox).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      state.sheetCtx.kind = b.dataset.kind;
    });
  }
  post.addEventListener('click', () => {
    createUpdate(state.sheetCtx.kind, title.value.trim(), body.value.trim() || 'No extra details.');
    closeSheet();
    toast('Shared — it disappears in 24 hours', 'check');
    if (state.tab !== 'home') setTab('home');
    setTimeout(() => { $('#screen-home .scroll').scrollTo({ top: 260, behavior: 'smooth' }); }, 280);
  });
  setTimeout(() => title.focus(), 260);
}

function openActivitySheet(id) {
  const a = activities.find(x => x.id === id);
  if (!a) return;
  const p = byId(a.hostId);
  openSheet({
    title: a.title,
    sub: `${a.day}, ${a.hour} · ${a.place}`,
    body: `
      <div style="display:flex;align-items:center;gap:12px;padding:6px 0 14px">
        ${avatar(p, 44)}
        <div style="flex:1"><div style="font-size:14.5px;font-weight:560">${esc(p.short)} is hosting</div>
        <div style="font-size:12.5px;color:var(--muted)">${esc(distLabel(a.km))} · ${a.going} people going</div></div>
      </div>
      <p style="font-size:14px;line-height:1.55;color:#4A3B32">Open to anyone nearby. The exact meeting point is shared with people who join, never publicly.</p>
      <div class="privacy-note" style="margin:16px 0 0">${icon('shield')}<p>Meeting points are only shared after you join.</p></div>`,
    foot: `<div style="display:flex;gap:10px">
      <button class="btn btn--primary" style="flex:1" data-action="join:${a.id}">Join</button>
      <button class="btn btn--soft" style="flex:1" data-action="person:${p.id}">View host</button></div>`
  });
}

function openPlaceSheet(id) {
  const pl = places.find(x => x.id === id);
  if (!pl) return;
  openSheet({
    title: pl.name,
    sub: `${pl.kind} · ${distLabel(pl.km)}`,
    body: `<div style="height:120px;border-radius:var(--r-lg);margin:4px 0 14px;background:linear-gradient(155deg,hsl(${pl.hue} 34% 84%),hsl(${(pl.hue + 20) % 360} 28% 60%))"></div>
      <p style="font-size:14.5px;line-height:1.55">${esc(pl.note)}</p>
      <p style="font-size:13px;color:var(--muted);margin-top:12px">Recommended by ${1 + Math.floor((pl.km || 1) * 3)} people near you.</p>`,
    foot: `<button class="btn btn--soft btn--block" data-action="save-place:${pl.id}">Save this place</button>`
  });
}

function openSettingsSheet() {
  openSheet({
    title: 'Settings',
    sub: 'This demo keeps everything in your browser.',
    body: `
      <button class="opt" data-action="privacy"><span class="ic">${icon('shield')}</span>
        <span class="tx"><span class="t" style="display:block">Location and privacy</span><span class="s" style="display:block">Control what people nearby can see</span></span>
        <span class="go">${icon('chev')}</span></button>
      <button class="opt" data-action="edit-profile"><span class="ic">${icon('edit')}</span>
        <span class="tx"><span class="t" style="display:block">Edit profile</span><span class="s" style="display:block">Name, bio and area</span></span>
        <span class="go">${icon('chev')}</span></button>
      <button class="opt" data-action="go-notifications"><span class="ic">${icon('bell')}</span>
        <span class="tx"><span class="t" style="display:block">Notifications</span><span class="s" style="display:block">What you hear about</span></span>
        <span class="go">${icon('chev')}</span></button>
      <button class="opt" data-action="about"><span class="ic">${icon('coffee')}</span>
        <span class="tx"><span class="t" style="display:block">About ming</span><span class="s" style="display:block">People. Moments. Possibilities.</span></span>
        <span class="go">${icon('chev')}</span></button>`
  });
}

function openPrivacySheet() {
  const on = state.locStatus === 'granted';
  openSheet({
    title: 'Location and privacy',
    sub: 'What people around you can and cannot see.',
    body: `
      <div class="privacy-note" style="margin:4px 0 16px">${icon('shield')}
        <p><b>Your exact location is hidden from other people.</b> Ming reads your position from your device to work out who is near you, and shares only a rounded distance.</p></div>
      <div style="font-size:14px;line-height:1.8">
        <div>Shown to others · your area, ${esc(hasLocation() ? areaLabel() : 'nothing while location is off')}</div>
        <div>Shown to others · rounded distance</div>
        <div style="color:var(--muted)">Never shown · coordinates, address, live movement</div>
      </div>
      <p style="margin-top:14px;font-size:13px;color:var(--muted)">Your location comes from your device. It cannot be typed in or changed by hand — allow or deny access in your browser settings.</p>
      <div style="margin-top:16px;font-size:13px;color:var(--muted)">Status: ${esc(locationLine().title.toLowerCase())}${state.userLocation ? ` · accuracy about ${Math.round(state.userLocation.accuracy)} m` : ''}</div>`,
    foot: on ? `<button class="btn btn--soft btn--block" data-action="close-sheet">Done</button>`
      : `<button class="btn btn--primary btn--block" data-action="enable-location">Enable location</button>`
  });
}

function openMoonAbout() {
  openSheet({
    title: 'Moonflower is private',
    sub: 'It never appears on your Ming profile.',
    body: `<p style="font-size:14.5px;line-height:1.6;padding:4px 0 8px">
      Ming is the world around you. Moonflower is the world inside you.</p>
      <p style="font-size:14px;line-height:1.6;color:var(--muted)">
      Nothing you write here is shared, ranked, shown to people nearby, or used anywhere else in the app. No one can see that you opened it.</p>`,
    foot: `<button class="btn btn--soft btn--block" data-action="close-sheet">Close</button>`
  });
}

function openAboutSheet() {
  openSheet({
    title: 'ming',
    sub: 'People. Moments. Possibilities.',
    body: `<p style="font-size:14.5px;line-height:1.6;padding:4px 0">Ming makes the world feel like a neighbourhood — the people, the moments and the possibilities within a short walk of you.</p>
      <p style="font-size:13px;color:var(--muted);margin-top:10px">Frontend demo. All data lives in this browser session.</p>`,
    foot: `<button class="btn btn--soft btn--block" data-action="close-sheet">Close</button>`
  });
}

/* ------------------------------------------------------------
   MODALS
------------------------------------------------------------ */
function openModal({ title, lede, fields, actions }) {
  modal.innerHTML = `<h2>${esc(title)}</h2>${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
    ${fields || ''}
    <div class="row">${actions.map(a => `<button class="btn ${a.cls}" data-action="${a.a}">${esc(a.t)}</button>`).join('')}</div>`;
  modal.classList.add('is-open');
  scrim.classList.add('is-open');
  const first = modal.querySelector('input, textarea');
  if (first) setTimeout(() => first.focus(), 240);
}
function closeModal() {
  modal.classList.remove('is-open');
  if (!sheet.classList.contains('is-open')) scrim.classList.remove('is-open');
}

/* ------------------------------------------------------------
   TOASTS
------------------------------------------------------------ */
function toast(msg, ic = 'check') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 240);
  }, 2600);
}

/* ------------------------------------------------------------
   ACTIONS (delegated)
------------------------------------------------------------ */
document.addEventListener('click', async e => {
  const openBtn = e.target.closest('[data-open]');
  if (openBtn) {
    const k = openBtn.dataset.open;
    if (k === 'search') openSearch();
    if (k === 'notifications') { renderNotifications(); pushStack('notifications'); }
    if (k === 'settings') openSettingsSheet();
    if (k === 'moon-about') openMoonAbout();
    return;
  }

  if (e.target.closest('[data-back]')) { popStack(); return; }

  const navBtn = e.target.closest('#nav button');
  if (navBtn) { setTab(navBtn.dataset.nav); return; }

  const host = e.target.closest('[data-action]');
  if (!host) return;
  const [verb, arg, arg2] = host.dataset.action.split(':');

  switch (verb) {
    case 'person': openPerson(arg); break;
    case 'like': toggleLike(arg); break;
    case 'comments': openComments(arg); break;
    case 'delete-update': deleteUpdate(arg); break;

    case 'confirm-delete':
      dailyUpdates = dailyUpdates.filter(u => u.id !== arg);
      closeModal(); rerenderFeeds();
      if (state.loaded.profile) renderProfile();
      toast('Update deleted', 'trash');
      break;

    case 'connect': connectWith(arg); break;
    case 'send-conn': sendConnection(arg); break;

    case 'confirm-remove': {
      const p = byId(arg);
      openModal({
        title: `Remove ${p.short}?`,
        lede: 'You will both stop seeing each other in Connections. You can connect again later.',
        actions: [{ t: 'Cancel', cls: 'btn--soft', a: 'close-modal' }, { t: 'Remove', cls: 'btn--primary', a: 'remove-conn:' + arg }]
      });
      break;
    }
    case 'remove-conn': {
      connections = connections.filter(c => c.personId !== arg);
      closeModal();
      renderConnections();
      if (state.loaded.profile) renderProfile();
      if (state.activePerson === arg && state.stack[state.stack.length - 1] === 'person') openPersonRefresh(arg);
      toast('Connection removed', 'x');
      break;
    }
    case 'accept-req': {
      const r = connectionRequests.find(x => x.id === arg);
      if (!r) break;
      connections.push({ personId: r.personId, at: now() });
      connectionRequests = connectionRequests.filter(x => x.id !== arg);
      renderConnections();
      if (state.loaded.profile) renderProfile();
      toast(`You and ${byId(r.personId).short} are connected`, 'check');
      break;
    }
    case 'decline-req': {
      connectionRequests = connectionRequests.filter(x => x.id !== arg);
      renderConnections();
      toast('Request dismissed', 'x');
      break;
    }

    case 'message': closeSheet(); popStackIfPerson(); openChat(arg); break;
    case 'chat': openChat(arg); break;

    case 'activity': openActivitySheet(arg); break;
    case 'join': {
      const a = activities.find(x => x.id === arg);
      if (a) { a.going += 1; }
      closeSheet();
      toast('You are going. The meeting point is in Messages.', 'check');
      if (state.loaded.discover) renderDiscover();
      if (state.loaded.nearby) renderNearby();
      break;
    }
    case 'place': openPlaceSheet(arg); break;
    case 'save-place': closeSheet(); toast('Place saved', 'check'); break;

    case 'filter':
      state.discoverFilter = arg;
      renderDiscover();
      $('#screen-discover .scroll').scrollTo({ top: 0, behavior: 'smooth' });
      break;

    case 'go-nearby': setTab('nearby'); break;
    case 'go-connections': renderConnections(); pushStack('connections'); break;
    case 'go-messages': renderMessages(); pushStack('messages'); break;
    case 'go-notifications': closeSheet(); renderNotifications(); pushStack('notifications'); break;
    case 'go-updates': $('#my-updates').scrollIntoView({ behavior: 'smooth', block: 'start' }); break;

    case 'enable-location': closeSheet(); requestLocation(() => { if (state.tab !== 'nearby') return; }); break;
    case 'expand-radius': state.radius = 5; renderNearby(); toast('Discovery area expanded to 5 km', 'pin'); break;

    case 'create':
      closeSheet();
      /* Spaces have their own creation flow (spaces.js) */
      setTimeout(() => arg === 'space' ? openWizard() : openComposer(arg), 180);
      break;
    case 'close-sheet': closeSheet(); break;
    case 'close-modal': closeModal(); break;

    case 'notif': {
      const n = notifications.find(x => x.id === arg);
      if (n) n.read = true;
      renderNotifications(); updateNotifDot();
      if (n && n.type === 'message') { openChat('p2'); }
      if (n && n.type === 'request') { renderConnections(); pushStack('connections'); }
      break;
    }

    case 'moon': openMoonRoom(arg); break;
    case 'moon-add': moonAdd(); break;
    case 'moon-intent': {
      const inp = $('#moon-input');
      if (!inp) break;
      inp.value = MOON_INTENTS[arg] ? MOON_INTENTS[arg].seed : '';
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
      autoGrow(inp);
      $('#moon-send').disabled = !inp.value.trim();
      break;
    }
    case 'step': {
      const g = moonGoals.find(x => x.id === arg);
      if (!g) break;
      g.steps[+arg2].done = !g.steps[+arg2].done;
      renderMoonRoom();
      break;
    }
    case 'rem': {
      const r = moonReminders.find(x => x.id === arg);
      if (r) r.done = !r.done;
      renderMoonRoom(); renderMoonflower();
      break;
    }
    case 'del-note':
      moonNotes = moonNotes.filter(n => n.id !== arg);
      renderMoonRoom(); renderMoonflower();
      toast('Note deleted', 'trash');
      break;
    case 'open-note': {
      const n = moonNotes.find(x => x.id === arg);
      if (!n) break;
      const row = $('#log-' + arg);
      if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.style.borderColor = 'rgba(221,226,234,.4)'; setTimeout(() => { row.style.borderColor = ''; }, 900); }
      break;
    }
    case 'save-goal': {
      const t = $('#mf-goal').value.trim();
      if (!t) { closeModal(); break; }
      const steps = $('#mf-steps').value.split('\n').map(s => s.trim()).filter(Boolean).map(s => ({ t: s, done: false }));
      moonGoals.unshift({ id: uid('g'), title: t, sub: $('#mf-sub').value.trim() || 'No deadline', steps: steps.length ? steps : [{ t: 'Start', done: false }] });
      closeModal(); renderMoonRoom(); renderMoonflower();
      toast('Goal added', 'check');
      break;
    }
    case 'save-rem': {
      const t = $('#mf-rem').value.trim();
      if (!t) { closeModal(); break; }
      moonReminders.unshift({ id: uid('rm'), text: t, when: $('#mf-when').value.trim() || 'Someday', done: false });
      closeModal(); renderMoonRoom(); renderMoonflower();
      toast('Reminder added', 'check');
      break;
    }

    case 'edit-profile': closeSheet(); setTimeout(editProfile, 160); break;
    case 'save-profile': {
      const newName = $('#ep-name').value.trim();
      const newBio = $('#ep-bio').value.trim();
      const requestedUsername = $('#ep-username').value.trim().toLowerCase();
      const currentUsername = currentUser.username.replace(/^@/, '').toLowerCase();
      const usernameChanged = requestedUsername !== currentUsername;

      if (newName) currentUser.name = newName;
      currentUser.headline = $('#ep-head').value.trim() || currentUser.headline;
      if (newBio) currentUser.bio = newBio;

      try {
        const { data: { session } } =
          await supabaseClient.auth.getSession();

        if (!session?.user) {
          toast('Please sign in again', 'alert');
          break;
        }

        if (usernameChanged) {
          if (!/^[A-Za-z0-9](?:[A-Za-z0-9_-]{1,28}[A-Za-z0-9])?$/.test(requestedUsername)) {
            toast('Username must be 3–30 characters and use only letters, numbers, underscores, or hyphens.', 'alert');
            break;
          }

          if (!usernameChangeAvailable()) {
            const next = usernameNextChangeDate();
            toast(
              next
                ? 'Username can be changed again on ' + next.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) + '.'
                : 'Username can only be changed once every 3 months.',
              'alert'
            );
            break;
          }

          const { data: usernameResult, error: usernameError } =
            await supabaseClient.rpc('change_username', {
              new_username: requestedUsername
            });

          if (usernameError) {
            console.error('Ming: username update failed:', usernameError.message);

            if (/already exists|duplicate|unique/i.test(usernameError.message)) {
              toast('That username is already taken.', 'alert');
            } else if (/3 months|three months|cooldown/i.test(usernameError.message)) {
              toast('Username can only be changed once every 3 months.', 'alert');
            } else {
              toast('Could not change username.', 'alert');
            }
            break;
          }

          currentUser.username = '@' + requestedUsername;
          currentUser.usernameChangedAt =
            usernameResult?.username_changed_at || new Date().toISOString();
        }

        const { error } = await supabaseClient
          .from('profiles')
          .update({
            display_name: currentUser.name,
            bio: currentUser.bio
          })
          .eq('id', session.user.id);

        if (error) {
          console.error('Ming: profile update failed:', error.message);
          toast('Could not save profile', 'alert');
          break;
        }

        closeModal();
        renderProfile();
        renderHome();
        renderMoonflower();
        toast(usernameChanged ? 'Profile and username updated' : 'Profile updated', 'check');

      } catch (error) {
        console.error('Ming: profile update failed:', error);
        toast('Could not save profile', 'alert');
      }

      break;
    }
    case 'edit-activity':
      openModal({
        title: 'What are you doing right now?',
        lede: 'People nearby see this on your profile. It clears itself overnight.',
        fields: `<div class="field"><label for="ea-now">Right now</label><input id="ea-now" type="text" value="${esc(currentUser.activity)}" maxlength="60" /></div>`,
        actions: [{ t: 'Cancel', cls: 'btn--soft', a: 'close-modal' }, { t: 'Save', cls: 'btn--primary', a: 'save-activity' }]
      });
      break;
    case 'save-activity':
      currentUser.activity = $('#ea-now').value.trim() || currentUser.activity;
      closeModal(); renderProfile();
      toast('Updated', 'check');
      break;

    case 'privacy': closeSheet(); setTimeout(openPrivacySheet, 160); break;
    case 'settings': closeSheet(); setTimeout(openSettingsSheet, 160); break;
    case 'about': closeSheet(); setTimeout(openAboutSheet, 160); break;

    case 'search-term':
      $('#search-input').value = arg;
      runSearch(arg);
      break;
  }
});

function popStackIfPerson() {
  if (state.stack[state.stack.length - 1] === 'person') popStack();
}

/* ------------------------------------------------------------
   INPUT WIRING
------------------------------------------------------------ */

if ($('#fab')) {
  $('#fab').addEventListener('click', openCreateSheet);
}

if ($('#home-avatar')) {
  $('#home-avatar').addEventListener('click', () => setTab('profile'));
}

if ($('#refresh-nearby')) {
  $('#refresh-nearby').addEventListener('click', async () => {
    if (state.locStatus !== 'granted') {
      requestLocation();
      return;
    }

    $('#nearby-body').innerHTML =
      `<div style="margin:0 18px">
        <div class="sk" style="height:330px;border-radius:var(--r-xl)"></div>
      </div>` + skeletonCards(1);

    await sleep(520);
    renderNearby();
    toast('Nearby refreshed', 'layers');
  });
}

if ($('#mark-all-read')) {
  $('#mark-all-read').addEventListener('click', () => {
    notifications.forEach(n => n.read = true);
    renderNotifications();
    updateNotifDot();
    toast('All caught up', 'check');
  });
}
scrim.addEventListener('click', () => { closeSheet(); closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modal.classList.contains('is-open')) return closeModal();
  if (sheet.classList.contains('is-open')) return closeSheet();
  if (state.stack.length) popStack();
});

/* Search input */
const searchInput = $('#search-input');
function runSearch(q) {
  state.searchQuery = q;
  $('#search-clear').hidden = !q;
  clearTimeout(searchTimer);
  if (!q.trim()) { renderSearch('idle'); return; }
  renderSearch('loading');
  searchTimer = setTimeout(() => renderSearch('results', q.trim()), 420);
}
searchInput.addEventListener('input', e => runSearch(e.target.value));
$('#search-clear').addEventListener('click', () => { searchInput.value = ''; runSearch(''); searchInput.focus(); });

/* Chat composer */
const chatInput = $('#chat-input'), chatSend = $('#chat-send');
function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 110) + 'px'; }
chatInput.addEventListener('input', () => { chatSend.disabled = !chatInput.value.trim(); autoGrow(chatInput); });
$('#chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = chatInput.value.trim();
  if (!v) return;
  chatInput.value = ''; chatInput.style.height = 'auto'; chatSend.disabled = true;
  sendMessage(v);
});
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-form').requestSubmit(); }
});

/* Moonflower composer */
const moonInput = $('#moon-input'), moonSend = $('#moon-send');
moonInput.addEventListener('input', () => { moonSend.disabled = !moonInput.value.trim(); autoGrow(moonInput); });
$('#moon-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = moonInput.value.trim();
  if (!v) return;
  moonInput.value = ''; moonInput.style.height = 'auto'; moonSend.disabled = true;
  moonChat.push({ me: true, text: v, at: now() });
  renderMoonRoom();
  if (window.MoonSky) window.MoonSky.pulse();
  const s = $('#moonroom-scroll'); s.scrollTop = s.scrollHeight;
  setTimeout(() => {
    moonChat.push({ me: false, text: moonAct(v), at: now() });
    renderMoonRoom();
    if (window.MoonSky) window.MoonSky.pulse();
    s.scrollTop = s.scrollHeight;
  }, 900);
});
moonInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#moon-form').requestSubmit(); }
});
$('#moonroom-action').addEventListener('click', moonAdd);

/* ------------------------------------------------------------
   BOOT
------------------------------------------------------------ */
function tickExpiry() {
  const before = dailyUpdates.length;
  dailyUpdates = dailyUpdates.filter(u => hoursLeft(u) > 0);
  if (dailyUpdates.length !== before) rerenderFeeds();
  $$('.upd').forEach(card => {
    const id = card.id.replace('upd-', '');
    const u = dailyUpdates.find(x => x.id === id);
    if (!u) return;
    const exp = card.querySelector('.expiry');
    const bar = card.querySelector('.life i');
    const h = hoursLeft(u);
    if (exp) exp.lastChild.textContent = lifeLabel(u);
    if (bar) bar.style.width = Math.max(2, Math.round((h / 24) * 100)) + '%';
    card.querySelector('.life').classList.toggle('low', h < 4);
  });
}

function boot() {
  renderHome();
  setTab('home');
  updateNotifDot();
  initLocation();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.locStatus === 'granted') requestLocation();
  });
  setInterval(tickExpiry, 60000);
}
boot();
























/*================================
   SPACES.JS
================================*/
/* ============================================================
   ming — Spaces
   spaces.js  ·  loaded after app.js, reuses its helpers
   ($, esc, icon, avatar, toast, openSheet, openModal, pushStack,
    popStack, currentUser, people, byId, hasLocation, distLabel…)

   Sections:
     Icons · Server (trust boundary) · Seed data · Screen mounting
     Spaces index · Create wizard · Invitations · Space shell
     Business · Friendly · Casual · Silly · Romantic
     Marketplace · Escrow · Disputes · Wallet · Events

   TRUST BOUNDARY
   --------------
   Everything below the `Server` object is presentation. The UI never
   assigns a status, a role, a balance or an order state: it calls
   Server.submit(action, payload) and re-renders whatever comes back.
   `Server` is a stand-in for the Postgres functions in schema.sql —
   same action names, same guards, same rejection reasons — so moving
   to Supabase is a transport change, not a rewrite.
   ============================================================ */

/* ------------------------------------------------------------
   ICONS (added to the existing sprite)
------------------------------------------------------------ */
(function addIcons() {
  const defs = {
    'sp-store': '<path d="M4 9.5 5.6 5h12.8L20 9.5M4 9.5h16M4 9.5v9A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-9M4 9.5a2.6 2.6 0 0 0 4 0 2.6 2.6 0 0 0 4 0 2.6 2.6 0 0 0 4 0 2.6 2.6 0 0 0 4 0"/>',
    'sp-wallet': '<rect x="3.5" y="6.5" width="17" height="12" rx="2.6"/><path d="M3.5 10h17M16.5 14.5h1.6"/>',
    'sp-key': '<circle cx="8.5" cy="12" r="3.6"/><path d="M12.1 12H20M17.4 12v3M14.6 12v2.2"/>',
    'sp-grid': '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
    'sp-list': '<path d="M8 6.5h12M8 12h12M8 17.5h12M4.2 6.5h.01M4.2 12h.01M4.2 17.5h.01"/>',
    'sp-poll': '<path d="M6 19V11M12 19V5M18 19v-5"/>',
    'sp-box': '<path d="m12 3.5 8 4v9l-8 4-8-4v-9z"/><path d="m4 7.5 8 4 8-4M12 11.5V20"/>',
    'sp-scale': '<path d="M12 4.5v15M6 8h12M6.5 8 4 14h5zM17.5 8 15 14h5zM8 19.5h8"/>',
    'sp-heart2': '<path d="M12 19.5s-6.6-4-6.6-8.5A3.6 3.6 0 0 1 12 8.6a3.6 3.6 0 0 1 6.6 2.4c0 4.5-6.6 8.5-6.6 8.5z"/>',
    'sp-game': '<rect x="3" y="7.5" width="18" height="9.5" rx="4.2"/><path d="M7.5 10.6v3.2M5.9 12.2h3.2M15.6 11.4h.01M17.8 13.2h.01"/>',
    'sp-sun': '<circle cx="12" cy="12" r="4"/><path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.9 6.1l-1.4 1.4M7.5 16.5l-1.4 1.4M17.9 17.9l-1.4-1.4M7.5 7.5 6.1 6.1"/>',
    'sp-doc': '<path d="M6.5 3.5h7L18 8v12.5H6.5z"/><path d="M13.2 3.5V8H18M9.5 12.5h5M9.5 16h3.5"/>',
    'sp-bolt': '<path d="M13.4 3.5 6 13.2h5.2L10.6 20.5 18 10.8h-5.2z"/>',
    'sp-copy': '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.4"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2"/>',
    'sp-refresh': '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4.5V10h-5.4"/>',
    'sp-camera': '<path d="M4 8.5h3.2l1.4-2.4h6.8l1.4 2.4H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8.5z"/><circle cx="12" cy="14" r="3.4"/>',
    'sp-globe': '<circle cx="12" cy="12" r="8.4"/><path d="M3.8 12h16.4M12 3.6c2.2 2.4 3.3 5.3 3.3 8.4S14.2 18 12 20.4C9.8 18 8.7 15.1 8.7 12S9.8 6 12 3.6z"/>'
  };
  const svg = document.querySelector('svg[aria-hidden="true"]');
  if (!svg) return;
  Object.entries(defs).forEach(([id, d]) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    s.setAttribute('id', 'i-' + id);
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.7');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = d;
    svg.appendChild(s);
  });
})();

/* ============================================================
   SERVER — the only thing allowed to mutate protected state.
   Mirror of schema.sql. Replace the bodies with Supabase RPC
   calls and the UI above it does not change.
============================================================ */
const Server = (() => {

  /* ---- "tables" ---- */
  const db = {
    spaces: [],
    members: [],          // { spaceId, userId, role, joinedAt }
    invites: [],          // { spaceId, codeHash, hint, expiresAt, maxUses, uses, revoked, version }
    content: [],          // { id, spaceId, kind, ... }  space-native content
    products: [],
    orders: [],
    orderEvents: [],      // append-only
    disputes: [],
    evidence: [],
    walletAccounts: [],   // { userId, asset, available, held }
    walletEntries: [],    // append-only ledger
    audit: []             // append-only
  };

  const session = { userId: currentUser.id };

  /* ---- roles & permissions (server-side truth) ---- */
  const ROLE_SETS = {
    business: ['owner', 'admin', 'manager', 'member'],
    friendly: ['owner', 'moderator', 'member'],
    casual: ['owner', 'moderator', 'member', 'guest'],
    silly: ['owner', 'moderator', 'member'],
    romantic: ['owner', 'member'],
    marketplace: ['owner', 'moderator', 'seller', 'buyer']
  };
  const RANK = { owner: 100, admin: 80, manager: 60, moderator: 60, seller: 40, member: 30, buyer: 30, guest: 10 };
  const NEEDS = {
    'space.update': 80, 'space.invite.rotate': 80, 'space.member.role': 80, 'space.member.remove': 60,
    'space.post': 30, 'space.post.pin': 60, 'space.moderate': 60,
    'product.create': 40, 'order.create': 30, 'dispute.arbitrate': 60
  };

  function roleOf(spaceId, userId = session.userId) {
    const m = db.members.find(x => x.spaceId === spaceId && x.userId === userId);
    return m ? m.role : null;
  }
  function can(spaceId, action, userId = session.userId) {
    const r = roleOf(spaceId, userId);
    if (!r) return false;
    const need = NEEDS[action];
    if (need === undefined) return true;
    return RANK[r] >= need;
  }

  /* ---- invitation codes ----
     Generated with a CSPRNG. Only the hash is stored; the plaintext is
     returned once, at issuance. Rotating bumps `version` and revokes the
     previous row, so the old code stops validating immediately.
     In production this is a Postgres function using pgcrypto's digest(). */
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  function randomCode() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const s = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
    return s.slice(0, 4) + '-' + s.slice(4, 8);
  }
  async function hashCode(code) {
    const norm = code.trim().toUpperCase();
    if (crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
      return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    }
    // Dev fallback: crypto.subtle needs a secure context and this file may be
    // opened from disk. Never ship this path — hashing belongs in Postgres.
    let h = 0x811c9dc5;
    for (let i = 0; i < norm.length; i++) { h ^= norm.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'dev' + h.toString(16);
  }

  async function issueInvite(spaceId, cfg = {}) {
    const prev = db.invites.filter(i => i.spaceId === spaceId && !i.revoked);
    prev.forEach(i => { i.revoked = true; i.revokedAt = Date.now(); });
    const code = randomCode();
    const row = {
      spaceId,
      codeHash: await hashCode(code),
      hint: code.slice(-2),
      createdAt: Date.now(),
      expiresAt: cfg.ttlHours ? Date.now() + cfg.ttlHours * 3600e3 : null,
      maxUses: cfg.maxUses || null,
      uses: 0,
      revoked: false,
      version: (prev[0] ? prev[0].version : 0) + 1
    };
    db.invites.push(row);
    audit(spaceId, prev.length ? 'invite.rotated' : 'invite.issued', { version: row.version });
    return { invite: row, code };   // plaintext leaves the server exactly once
  }

  async function redeemInvite(code) {
    const h = await hashCode(code);
    const row = db.invites.find(i => i.codeHash === h && !i.revoked);
    if (!row) return { ok: false, error: 'That code is not valid. It may have been regenerated.' };
    if (row.expiresAt && row.expiresAt < Date.now()) return { ok: false, error: 'That invitation has expired.' };
    if (row.maxUses && row.uses >= row.maxUses) return { ok: false, error: 'That invitation has been used its maximum number of times.' };
    const space = db.spaces.find(s => s.id === row.spaceId);
    if (roleOf(space.id)) return { ok: false, error: 'You are already in this Space.' };
    if (space.maxMembers && memberCount(space.id) >= space.maxMembers) return { ok: false, error: 'This Space is full.' };
    row.uses++;
    const role = space.nature === 'marketplace' ? 'buyer' : 'member';
    db.members.push({ spaceId: space.id, userId: session.userId, role, joinedAt: Date.now(), approved: !space.requireApproval });
    audit(space.id, 'member.joined', { via: 'invite', version: row.version });
    return { ok: true, data: { space } };
  }

  const memberCount = spaceId => db.members.filter(m => m.spaceId === spaceId).length;

  function audit(spaceId, event, meta) {
    db.audit.push(Object.freeze({
      id: 'au_' + db.audit.length, spaceId, actor: session.userId,
      event, meta: meta || {}, at: Date.now()
    }));
  }

  /* ---- escrow state machine ----
     transition -> { to, who: roles allowed, guard }
     The client may only name a transition. The server decides if it is legal
     for that actor, in that state, at that time. */
  const ORDER_FLOW = {
    pending: {
      fund: { to: 'funded', who: ['buyer'] },
      cancel: { to: 'cancelled', who: ['buyer', 'seller'] }
    },
    funded: {
      seller_confirm: { to: 'seller_confirmed', who: ['seller'] },
      cancel: { to: 'cancelled', who: ['seller'] },
      dispute: { to: 'disputed', who: ['buyer', 'seller'] }
    },
    seller_confirmed: {
      ship: { to: 'shipped', who: ['seller'] },
      dispute: { to: 'disputed', who: ['buyer', 'seller'] }
    },
    shipped: {
      confirm_delivery: { to: 'delivered', who: ['buyer'] },
      dispute: { to: 'disputed', who: ['buyer', 'seller'] }
    },
    delivered: {
      accept: { to: 'accepted', who: ['buyer'] },
      dispute: { to: 'disputed', who: ['buyer'] }
    },
    accepted: {
      release: { to: 'completed', who: ['system'] }
    },
    disputed: {
      resolve_release: { to: 'completed', who: ['arbiter'] },
      resolve_refund: { to: 'refunded', who: ['arbiter'] }
    },
    completed: {}, refunded: {}, cancelled: {}
  };

  const TERMINAL = ['completed', 'refunded', 'cancelled'];

  function partyOf(order, userId = session.userId) {
    if (order.buyerId === userId) return 'buyer';
    if (order.sellerId === userId) return 'seller';
    if (can(order.spaceId, 'dispute.arbitrate', userId)) return 'arbiter';
    return null;
  }

  function orderEvent(order, from, to, transition, meta) {
    db.orderEvents.push(Object.freeze({
      id: 'oe_' + db.orderEvents.length, orderId: order.id,
      from, to, transition, actor: session.userId, at: Date.now(), meta: meta || {}
    }));
  }

  /* ---- wallet ledger (development mode, no custody) ----
     Balances are derived from append-only entries, never assigned.
     A real deployment replaces this with a custodial provider and
     on-chain settlement; nothing here touches a blockchain. */
  function account(userId, asset) {
    let a = db.walletAccounts.find(x => x.userId === userId && x.asset === asset);
    if (!a) { a = { userId, asset, available: 0, held: 0 }; db.walletAccounts.push(a); }
    return a;
  }
  function ledger(userId, asset, kind, amount, ref, note) {
    db.walletEntries.unshift(Object.freeze({
      id: 'we_' + db.walletEntries.length, userId, asset, kind, amount, ref, note,
      at: Date.now(), mode: 'development'
    }));
  }
  function hold(userId, asset, amount, ref) {
    const a = account(userId, asset);
    if (a.available < amount) return false;
    a.available -= amount; a.held += amount;
    ledger(userId, asset, 'escrow_hold', -amount, ref, 'Held in escrow');
    return true;
  }
  function releaseHold(order, toSeller) {
    const a = account(order.buyerId, order.asset);
    a.held -= order.total;
    if (toSeller) {
      ledger(order.buyerId, order.asset, 'escrow_release', 0, order.id, 'Released to seller');
      const s = account(order.sellerId, order.asset);
      const fee = Math.round(order.total * 0.015 * 100) / 100;      // platform fee
      s.available += order.total - fee;
      ledger(order.sellerId, order.asset, 'sale_payout', order.total - fee, order.id, 'Sale settled');
      ledger(order.sellerId, order.asset, 'fee', -fee, order.id, 'Ming fee 1.5%');
    } else {
      a.available += order.total;
      ledger(order.buyerId, order.asset, 'escrow_refund', order.total, order.id, 'Refunded');
    }
  }

  /* ---- the single entry point ---- */
  async function submit(action, p = {}) {
    const deny = msg => ({ ok: false, error: msg });

    switch (action) {

      case 'space.create': {
        if (!p.name || p.name.trim().length < 2) return deny('A Space needs a name.');
        if (!ROLE_SETS[p.nature]) return deny('Unknown Space nature.');
        const space = {
          id: 'sp_' + Math.random().toString(36).slice(2, 9),
          name: p.name.trim(),
          description: (p.description || '').trim(),
          nature: p.nature,
          privacy: p.privacy || 'private',
          discoverable: p.privacy === 'discoverable',
          requireApproval: !!p.requireApproval,
          maxMembers: p.maxMembers || null,
          hue: p.hue,
          locationLinked: !!p.locationLinked,
          expiresAt: p.ttlDays ? Date.now() + p.ttlDays * 864e5 : null,
          features: p.features || {},
          ownerId: session.userId,
          createdAt: Date.now()
        };
        db.spaces.push(space);
        db.members.push({ spaceId: space.id, userId: session.userId, role: 'owner', joinedAt: Date.now(), approved: true });
        audit(space.id, 'space.created', { nature: space.nature });
        const inv = await issueInvite(space.id, { ttlHours: p.inviteTtlHours, maxUses: p.inviteMaxUses });
        return { ok: true, data: { space, code: inv.code } };
      }

      case 'space.invite.rotate': {
        if (!can(p.spaceId, 'space.invite.rotate')) return deny('Only owners and admins can regenerate the code.');
        const inv = await issueInvite(p.spaceId, { ttlHours: p.ttlHours, maxUses: p.maxUses });
        return { ok: true, data: { code: inv.code, invite: inv.invite } };
      }

      case 'space.join': return redeemInvite(p.code || '');

      case 'space.member.role': {
        if (!can(p.spaceId, 'space.member.role')) return deny('You cannot change roles here.');
        const target = db.members.find(m => m.spaceId === p.spaceId && m.userId === p.userId);
        if (!target) return deny('Not a member.');
        if (target.role === 'owner') return deny('The owner role cannot be reassigned here.');
        const space = db.spaces.find(s => s.id === p.spaceId);
        if (!ROLE_SETS[space.nature].includes(p.role)) return deny('That role does not exist in this Space.');
        target.role = p.role;
        audit(p.spaceId, 'member.role_changed', { userId: p.userId, role: p.role });
        return { ok: true, data: { member: target } };
      }

      case 'space.post': {
        if (!can(p.spaceId, 'space.post')) return deny('You cannot post in this Space.');
        const row = {
          id: 'c_' + Math.random().toString(36).slice(2, 8),
          spaceId: p.spaceId, kind: p.kind, authorId: session.userId,
          at: Date.now(), ...p.payload
        };
        db.content.unshift(row);
        audit(p.spaceId, 'content.created', { kind: p.kind });
        return { ok: true, data: { row } };
      }

      case 'content.mutate': {
        const row = db.content.find(c => c.id === p.id);
        if (!row) return deny('Gone.');
        if (p.op === 'react') {
          row.reacts = row.reacts || {};
          row.mine = row.mine || {};
          const on = !row.mine[p.key];
          row.mine[p.key] = on;
          row.reacts[p.key] = (row.reacts[p.key] || 0) + (on ? 1 : -1);
        }
        if (p.op === 'vote') {
          if (row.voted !== undefined && row.voted !== null) row.options[row.voted].votes--;
          row.options[p.index].votes++;
          row.voted = p.index;
        }
        if (p.op === 'toggle') {
          if (!can(row.spaceId, 'space.post')) return deny('Not allowed.');
          row.done = !row.done;
          audit(row.spaceId, 'task.toggled', { id: row.id, done: row.done });
        }
        if (p.op === 'listadd') row.items.push({ t: p.text, done: false });
        if (p.op === 'listtoggle') row.items[p.index].done = !row.items[p.index].done;
        return { ok: true, data: { row } };
      }

      case 'product.create': {
        if (!can(p.spaceId, 'product.create')) return deny('You need the seller role in this Space.');
        if (!(p.price > 0)) return deny('Price must be positive.');
        const row = {
          id: 'pr_' + Math.random().toString(36).slice(2, 8),
          spaceId: p.spaceId, sellerId: session.userId,
          title: p.title, price: p.price, asset: 'USDT',
          condition: p.condition, category: p.category,
          qty: p.qty || 1, handover: p.handover, description: p.description,
          hue: Math.floor(Math.random() * 360), createdAt: Date.now(), status: 'listed'
        };
        db.products.unshift(row);
        audit(p.spaceId, 'product.listed', { id: row.id, price: row.price });
        return { ok: true, data: { row } };
      }

      case 'order.create': {
        const prod = db.products.find(x => x.id === p.productId);
        if (!prod || prod.status !== 'listed') return deny('That listing is no longer available.');
        if (prod.sellerId === session.userId) return deny('You cannot buy your own listing.');
        if (!can(prod.spaceId, 'order.create')) return deny('Join this Space to buy.');
        /* Price comes from the listing row, never from the client. */
        const order = {
          id: 'MO-' + Date.now().toString(36).toUpperCase().slice(-6),
          spaceId: prod.spaceId, productId: prod.id,
          buyerId: session.userId, sellerId: prod.sellerId,
          unit: prod.price, qty: 1, total: prod.price,
          asset: prod.asset, status: 'pending',
          idempotencyKey: p.idempotencyKey,
          createdAt: Date.now(), acceptanceDeadline: null
        };
        const dupe = db.orders.find(o => o.idempotencyKey === p.idempotencyKey);
        if (dupe) return { ok: true, data: { order: dupe } };   // replay-safe
        db.orders.unshift(order);
        orderEvent(order, null, 'pending', 'create');
        audit(prod.spaceId, 'order.created', { id: order.id });
        return { ok: true, data: { order } };
      }

      case 'order.transition': {
        const order = db.orders.find(o => o.id === p.orderId);
        if (!order) return deny('Order not found.');
        const allowed = ORDER_FLOW[order.status] || {};
        const rule = allowed[p.transition];
        if (!rule) return deny(`"${p.transition}" is not possible while this order is ${order.status.replace('_', ' ')}.`);
        const party = partyOf(order);
        if (!party || !rule.who.includes(party)) return deny('You are not a party to that step.');

        const from = order.status;

        if (p.transition === 'fund') {
          if (!hold(order.buyerId, order.asset, order.total, order.id)) {
            return deny('Not enough available balance in your development wallet.');
          }
        }
        if (p.transition === 'confirm_delivery') {
          order.acceptanceDeadline = Date.now() + 72 * 3600e3;   // buyer acceptance window
        }
        if (p.transition === 'cancel' && from === 'funded') releaseHold(order, false);
        if (p.transition === 'resolve_release') releaseHold(order, true);
        if (p.transition === 'resolve_refund') releaseHold(order, false);

        order.status = rule.to;
        orderEvent(order, from, order.status, p.transition, p.meta);
        audit(order.spaceId, 'order.' + p.transition, { id: order.id, to: order.status });

        /* Release is a system step, not a user action: acceptance triggers it. */
        if (order.status === 'accepted') {
          releaseHold(order, true);
          order.status = 'completed';
          orderEvent(order, 'accepted', 'completed', 'release', { by: 'system' });
          audit(order.spaceId, 'order.released', { id: order.id });
        }
        if (TERMINAL.includes(order.status)) {
          const prod = db.products.find(x => x.id === order.productId);
          if (prod && order.status === 'completed') { prod.qty -= order.qty; if (prod.qty <= 0) prod.status = 'sold'; }
        }
        return { ok: true, data: { order } };
      }

      case 'dispute.open': {
        const order = db.orders.find(o => o.id === p.orderId);
        if (!order) return deny('Order not found.');
        const party = partyOf(order);
        if (party !== 'buyer' && party !== 'seller') return deny('Only the buyer or seller can open a dispute.');
        const res = await submit('order.transition', { orderId: order.id, transition: 'dispute', meta: { reason: p.reason } });
        if (!res.ok) return res;
        const d = {
          id: 'dp_' + Math.random().toString(36).slice(2, 8),
          orderId: order.id, spaceId: order.spaceId,
          openedBy: session.userId, reason: p.reason, detail: p.detail,
          status: 'evidence', openedAt: Date.now(),
          evidenceDeadline: Date.now() + 96 * 3600e3
        };
        db.disputes.unshift(d);
        audit(order.spaceId, 'dispute.opened', { orderId: order.id, reason: p.reason });
        return { ok: true, data: { dispute: d } };
      }

      case 'dispute.evidence': {
        const d = db.disputes.find(x => x.id === p.disputeId);
        if (!d) return deny('Dispute not found.');
        const order = db.orders.find(o => o.id === d.orderId);
        const party = partyOf(order);
        if (!party) return deny('You are not a party to this dispute.');
        db.evidence.push(Object.freeze({
          id: 'ev_' + db.evidence.length, disputeId: d.id, party,
          userId: session.userId, kind: p.kind, label: p.label, at: Date.now()
        }));
        audit(d.spaceId, 'dispute.evidence_added', { disputeId: d.id, kind: p.kind });
        return { ok: true, data: { dispute: d } };
      }

      default: return deny('Unknown action.');
    }
  }

  return {
    db, session, submit, can, roleOf, memberCount,
    ROLE_SETS, RANK, ORDER_FLOW, TERMINAL, partyOf,
    account, ledger,
    orderEvents: id => db.orderEvents.filter(e => e.orderId === id),
    evidenceFor: id => db.evidence.filter(e => e.disputeId === id),
    auditFor: id => db.audit.filter(a => a.spaceId === id).slice().reverse(),
    /* seeding only — never call from UI code */
    _seed: fn => fn(db, { issueInvite, ledger, account })
  };
})();

/* ============================================================
   SPACE NATURES — identity, not decoration
============================================================ */
const NATURES = {
  business: {
    label: 'Business', icon: 'sp-doc', hue: 215,
    blurb: 'Teams, clients and projects. Structured and on the record.',
    swatch: 'linear-gradient(135deg,#1A1E25,#2C333D 60%,#C5A572)',
    tabs: [['brief', 'Brief', 'sp-doc'], ['work', 'Work', 'sp-list'], ['people', 'People', 'users'], ['log', 'Log', 'clock']]
  },
  friendly: {
    label: 'Friendly', icon: 'users', hue: 24,
    blurb: 'Your people. Moments, plans and running jokes.',
    swatch: 'linear-gradient(135deg,#F3DCC6,#C98B63 70%,#8A5236)',
    tabs: [['home', 'Home', 'home'], ['moments', 'Moments', 'sp-camera'], ['events', 'Events', 'cal'], ['people', 'People', 'users']]
  },
  casual: {
    label: 'Casual', icon: 'sp-bolt', hue: 160,
    blurb: 'Meetups, visitors and things happening in the next few hours.',
    swatch: 'linear-gradient(135deg,#E7F1EC,#8FC7B0 60%,#14785C)',
    tabs: [['now', 'Now', 'sp-bolt'], ['around', 'Around', 'pin'], ['people', 'People', 'users']]
  },
  silly: {
    label: 'Silly', icon: 'sp-game', hue: 14,
    blurb: 'Nonsense, deliberately. Stickers, prompts and a scoreboard.',
    swatch: 'linear-gradient(135deg,#FFE7B8,#FF9A6C 55%,#FF5A36)',
    tabs: [['chaos', 'Chaos', 'sp-bolt'], ['wall', 'Wall', 'sp-grid'], ['game', 'Game', 'sp-game'], ['people', 'People', 'users']]
  },
  romantic: {
    label: 'Romantic', icon: 'sp-heart2', hue: 350,
    blurb: 'Two people. Memories, plans and nothing on display.',
    swatch: 'linear-gradient(135deg,#2A1A1C,#6E3A3C 60%,#C98B6B)',
    tabs: [['us', 'Us', 'sp-heart2'], ['memories', 'Memories', 'sp-camera'], ['plans', 'Plans', 'cal'], ['lists', 'Lists', 'sp-list']]
  },
  marketplace: {
    label: 'Marketplace', icon: 'sp-store', hue: 150,
    blurb: 'Buy and sell inside a Space, with funds held until delivery.',
    swatch: 'linear-gradient(135deg,#E9EEEB,#8FB3A0 55%,#1E5F44)',
    tabs: [['market', 'Market', 'sp-store'], ['orders', 'Orders', 'sp-box'], ['sellers', 'Sellers', 'users'], ['cases', 'Cases', 'sp-scale']]
  }
};

const ORDER_STATES = {
  pending: { t: 'Awaiting payment', cls: '' },
  funded: { t: 'Payment held', cls: 'held' },
  seller_confirmed: { t: 'Seller confirmed', cls: 'held' },
  shipped: { t: 'On the way', cls: 'held' },
  delivered: { t: 'Delivered — acceptance window', cls: 'held' },
  accepted: { t: 'Accepted', cls: 'done' },
  completed: { t: 'Completed', cls: 'done' },
  disputed: { t: 'In dispute', cls: 'disputed' },
  refunded: { t: 'Refunded', cls: 'cancelled' },
  cancelled: { t: 'Cancelled', cls: 'cancelled' }
};
const FLOW_ORDER = ['pending', 'funded', 'seller_confirmed', 'shipped', 'delivered', 'completed'];
const FLOW_COPY = {
  pending: ['Order created', 'Listing reserved at the listed price'],
  funded: ['Payment held', 'Held by Ming, not sent to the seller'],
  seller_confirmed: ['Seller confirmed', 'Seller accepted the order'],
  shipped: ['Handed over', 'Shipped or handed to the buyer'],
  delivered: ['Delivery confirmed', 'Starts a 72-hour acceptance window'],
  completed: ['Funds released', 'Settled to the seller']
};

/* ============================================================
   SPACES STATE (view state only)
============================================================ */
const sp = {
  activeId: null,
  tab: null,
  wizard: null,
  shownCodes: {},        // plaintext held in memory for the owner, this session only
  activeOrder: null,
  marketTab: 'all'
};

const spaceById = id => Server.db.spaces.find(s => s.id === id);
const mySpaces = () => Server.db.members
  .filter(m => m.userId === Server.session.userId)
  .map(m => spaceById(m.spaceId))
  .filter(Boolean)
  .sort((a, b) => b.createdAt - a.createdAt);
const contentOf = (spaceId, kind) => Server.db.content.filter(c => c.spaceId === spaceId && c.kind === kind);
const money = (n, asset = 'USDT') => (asset === 'BTC' ? n.toFixed(5) : n.toFixed(2)) + ' ' + asset;

function nameOf(userId) {
  if (userId === currentUser.id) return 'You';
  const p = byId(userId);
  return p ? p.short : 'Someone';
}
function personOf(userId) {
  return userId === currentUser.id ? currentUser : (byId(userId) || currentUser);
}

/* ============================================================
   SCREEN MOUNTING  (stack screens, same system as the rest of Ming)
============================================================ */
function mountScreen(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild;
  document.getElementById('app').insertBefore(el, document.getElementById('fab'));
  return el;
}

mountScreen(`
<section class="screen screen--stack has-nav" id="screen-spaces" aria-label="Your Spaces">
  <header class="topbar">
    <div class="topbar-row">
      <button class="icon-btn back-btn" data-back aria-label="Back"><svg><use href="#i-back"/></svg></button>
      <div style="flex:1 1 auto"><div class="topbar-title">Spaces</div>
      <div class="topbar-sub">Your own worlds inside Ming</div></div>
      <button class="icon-btn" data-sp="join" aria-label="Join with a code"><svg><use href="#i-sp-key"/></svg></button>
    </div>
  </header>
  <div class="scroll" data-scroll><div id="spaces-body"></div></div>
</section>`);

mountScreen(`
<section class="screen screen--stack" id="screen-createspace" aria-label="Create a Space">
  <header class="topbar">
    <div class="topbar-row">
      <button class="icon-btn back-btn" id="wz-close" aria-label="Close"><svg><use href="#i-x"/></svg></button>
      <div style="flex:1 1 auto"><div class="topbar-title" id="wz-title">Create a Space</div>
      <div class="topbar-sub" id="wz-sub"></div></div>
    </div>
    <div class="wz-progress" id="wz-progress"></div>
  </header>
  <div class="scroll" data-scroll><div id="wz-body"></div></div>
  <div class="wz-foot">
    <button class="btn btn--soft btn--back" id="wz-back" aria-label="Previous step"><svg><use href="#i-back"/></svg></button>
    <button class="btn btn--primary" id="wz-next">Continue</button>
  </div>
</section>`);

mountScreen(`
<section class="screen screen--stack sp" id="screen-space" aria-label="Space">
  <header class="sp-head" id="sp-head"></header>
  <div class="sp-scroll" data-scroll id="sp-scroll"><div id="sp-body"></div></div>
  <nav class="sp-tabs" id="sp-tabs" aria-label="Space sections"></nav>
</section>`);

mountScreen(`
<section class="screen screen--stack sp" id="screen-order" aria-label="Order">
  <header class="sp-head">
    <div class="sp-bar">
      <button class="back" data-back aria-label="Back"><svg><use href="#i-back"/></svg></button>
      <div class="ttl"><div class="n" id="ord-title">Order</div><div class="m" id="ord-sub"></div></div>
    </div>
  </header>
  <div class="sp-scroll" data-scroll style="padding-bottom:calc(var(--safe-b) + 24px)"><div id="ord-body"></div></div>
</section>`);

mountScreen(`
<section class="screen screen--stack wallet-shell" id="screen-wallet" aria-label="Ming Wallet">
  <header class="topbar">
    <div class="topbar-row">
      <button class="icon-btn back-btn" data-back aria-label="Back"><svg><use href="#i-back"/></svg></button>
      <div style="flex:1 1 auto"><div class="topbar-title">Ming Wallet</div>
      <div class="topbar-sub">Development mode</div></div>
    </div>
  </header>
  <div class="scroll" data-scroll><div id="wallet-body"></div></div>
</section>`);

/* scroll shadows for the new screens */
['#screen-spaces .scroll', '#screen-createspace .scroll', '#screen-wallet .scroll'].forEach(sel => {
  const el = document.querySelector(sel);
  el.addEventListener('scroll', () => {
    el.parentElement.querySelector('.topbar').classList.toggle('is-scrolled', el.scrollTop > 6);
  }, { passive: true });
});

/* ============================================================
   SPACES INDEX
============================================================ */
function openSpaces() { renderSpaces(); pushStack('spaces'); }

function renderSpaces() {
  renderHomeSpaces();
  const list = mySpaces();
  $('#spaces-body').innerHTML = `
    <div style="padding:14px 18px 6px">
      <button class="btn btn--primary btn--block" data-sp="create">${icon('plus')}Create a Space</button>
      <button class="btn btn--ghost btn--block" style="margin-top:6px" data-sp="join">I have an invitation code</button>
    </div>
    ${list.length ? `<div class="section">${sectionHead('Your Spaces', `${list.length}`)}
      ${list.map(spaceTile).join('')}</div>`
    : emptyState('No Spaces yet', 'A Space is a private world for one part of your life — your team, your friends, a market, someone you love.')}
    <div class="section">${sectionHead('Ming Wallet', 'Development mode')}
      <div class="menu-list">
        <button class="menu-item" data-sp="wallet">${icon('sp-wallet')}<span class="t">Balances and activity</span><span class="go">${icon('chev')}</span></button>
      </div>
    </div>`;
}

function spaceTile(s) {
  const n = NATURES[s.nature];
  const members = Server.db.members.filter(m => m.spaceId === s.id).slice(0, 4).map(m => personOf(m.userId));
  return `<button class="sp-tile" data-sp="open:${s.id}">
    <div class="cover" style="background:${n.swatch}">
      <span class="nature">${n.label}</span>
    </div>
    <div class="info">
      <div class="n">${esc(s.name)}</div>
      ${s.description ? `<div class="d">${esc(s.description)}</div>` : ''}
      <div class="f">
        <span class="stack-avs">${members.map(p => avatar(p, 28, { status: false })).join('')}</span>
        <span>${Server.memberCount(s.id)} ${Server.memberCount(s.id) === 1 ? 'member' : 'members'} · ${esc(Server.roleOf(s.id) || 'guest')}</span>
      </div>
    </div>
  </button>`;
}

/* ============================================================
   CREATE WIZARD — progressive disclosure, 8 steps
============================================================ */
const WZ_STEPS = ['nature', 'identity', 'privacy', 'look', 'members', 'invite', 'features', 'review'];

function openWizard() {
  sp.wizard = {
    i: 0, dir: 1,
    nature: null, name: '', description: '',
    privacy: 'private', requireApproval: false,
    hue: null, maxMembers: null,
    inviteTtlHours: 24, inviteMaxUses: null,
    locationLinked: false, ttlDays: null,
    features: {}
  };
  renderWizard();
  pushStack('createspace');
}

function wzSet(patch, rerender = true) {
  Object.assign(sp.wizard, patch);
  if (rerender) renderWizard();
}

function renderWizard() {
  const w = sp.wizard;
  const step = WZ_STEPS[w.i];
  $('#wz-progress').innerHTML = WZ_STEPS.map((_, i) => `<i class="${i <= w.i ? 'on' : ''}"></i>`).join('');
  $('#wz-sub').textContent = `Step ${w.i + 1} of ${WZ_STEPS.length}`;
  $('#wz-back').style.visibility = w.i === 0 ? 'hidden' : 'visible';
  $('#wz-body').innerHTML = `<div class="wz-step ${w.dir < 0 ? 'back' : ''}">${WZ_RENDER[step](w)}</div>`;
  const next = $('#wz-next');
  next.textContent = step === 'review' ? 'Create Space' : 'Continue';
  next.disabled = !wzValid(step, w);
  $('#screen-createspace .scroll').scrollTop = 0;
}

function wzValid(step, w) {
  if (step === 'nature') return !!w.nature;
  if (step === 'identity') return w.name.trim().length >= 2;
  return true;
}

const WZ_RENDER = {
  nature: w => `
    <h2>What are you creating?</h2>
    <p class="lede">This decides how the Space looks and what it can do. It cannot be changed later.</p>
    <div class="nature-grid">
      ${Object.entries(NATURES).map(([k, n]) => `
        <button class="nature-card" aria-pressed="${w.nature === k}" data-sp="wz-nature:${k}">
          <span class="swatch" style="background:${n.swatch}"></span>
          <span class="tick">${icon('check')}</span>
          <span class="t">${n.label}</span>
          <span class="s">${esc(n.blurb)}</span>
        </button>`).join('')}
    </div>`,

  identity: w => `
    <h2>Name your Space</h2>
    <p class="lede">Members see this everywhere. Short names work best.</p>
    <div class="field"><label for="wz-name">Name</label>
      <input id="wz-name" type="text" maxlength="40" value="${esc(w.name)}" placeholder="${w.nature === 'marketplace' ? 'The Corner Market' : w.nature === 'business' ? 'Northline Studio' : 'The Circle'}" /></div>
    <div class="field"><label for="wz-desc">What is it for?</label>
      <textarea id="wz-desc" maxlength="160" placeholder="One line so people know what they are joining.">${esc(w.description)}</textarea></div>`,

  privacy: w => `
    <h2>Who can find it?</h2>
    <p class="lede">Privacy is set here and enforced on the server, not by hiding buttons.</p>
    ${[
      ['private', 'Invitation only', 'Nobody can find this Space. The only way in is a code you share.'],
      ['approval', 'Invitation, with approval', 'People with a code request to join. You let them in.'],
      ['discoverable', 'Discoverable nearby', 'Appears in Discover for people in your area. Joining still needs a code.']
    ].map(([k, t, s]) => `
      <button class="choice" aria-pressed="${w.privacy === k}" data-sp="wz-privacy:${k}">
        <span class="radio"></span>
        <span class="tx"><span class="t" style="display:block">${t}</span><span class="s" style="display:block">${s}</span></span>
      </button>`).join('')}
    ${w.nature === 'romantic' ? `<div class="ephemeral-note" style="margin-top:14px">${icon('lock')}<span>Romantic Spaces are always invitation only and never appear in Discover, whatever else you pick.</span></div>` : ''}`,

  look: w => `
    <h2>Set the atmosphere</h2>
    <p class="lede">A ${NATURES[w.nature].label} Space already has its own environment. Pick the cover that fits yours.</p>
    <div class="nature-grid" style="grid-template-columns:1fr 1fr 1fr">
      ${[0, 40, 90, 160, 215, 280, 320, 350, null].map(h => `
        <button class="nature-card" style="min-height:76px;padding:0;overflow:hidden" aria-pressed="${w.hue === h}" data-sp="wz-hue:${h}">
          <span class="swatch" style="margin:0;height:100%;border:0;background:${h === null ? NATURES[w.nature].swatch : `linear-gradient(140deg,hsl(${h} 42% 78%),hsl(${(h + 320) % 360} 38% 44%))`}"></span>
          <span class="tick">${icon('check')}</span>
        </button>`).join('')}
    </div>
    <p class="lede" style="margin-top:14px">The first swatch is this nature's own palette.</p>`,

  members: w => `
    <h2>Who is in it?</h2>
    <p class="lede">Roles for a ${NATURES[w.nature].label} Space: ${Server.ROLE_SETS[w.nature].join(', ')}. You will be the owner.</p>
    <button class="toggle-row" aria-pressed="${w.requireApproval}" data-sp="wz-toggle:requireApproval">
      <span class="tx"><span class="t" style="display:block">Approve each person</span>
      <span class="s" style="display:block">A valid code puts them in a queue, not in the room</span></span>
      <span class="sw"></span>
    </button>
    <div class="field"><label for="wz-max">Member limit</label>
      <input id="wz-max" type="text" inputmode="numeric" value="${w.maxMembers || ''}" placeholder="No limit" /></div>
    ${w.nature === 'casual' ? `
      <div class="field"><label for="wz-ttl">Close the Space automatically</label>
        <input id="wz-ttl" type="text" inputmode="numeric" value="${w.ttlDays || ''}" placeholder="Days — leave empty to keep it open" /></div>` : ''}
    ${(w.nature === 'casual' || w.nature === 'marketplace') ? `
      <button class="toggle-row" aria-pressed="${w.locationLinked}" data-sp="wz-toggle:locationLinked">
        <span class="tx"><span class="t" style="display:block">Use my area</span>
        <span class="s" style="display:block">Shows distances inside the Space. Your coordinates stay on your device</span></span>
        <span class="sw"></span>
      </button>` : ''}`,

  invite: w => `
    <h2>How people get in</h2>
    <p class="lede">Your code is generated and stored hashed on the server. Regenerating one kills the old one instantly.</p>
    <div class="field"><label>Code expires after</label>
      <div class="pick">${[[6, '6 hours'], [24, '24 hours'], [168, '7 days'], [0, 'Never']].map(([h, t]) => `
        <button type="button" aria-pressed="${w.inviteTtlHours === h}" data-sp="wz-ttlh:${h}">${t}</button>`).join('')}</div></div>
    <div class="field"><label>Maximum uses</label>
      <div class="pick">${[[1, 'One person'], [10, '10'], [50, '50'], [0, 'Unlimited']].map(([n, t]) => `
        <button type="button" aria-pressed="${(w.inviteMaxUses || 0) === n}" data-sp="wz-maxuses:${n}">${t}</button>`).join('')}</div></div>
    <div class="ephemeral-note">${icon('shield')}<span>Ming stores a hash of the code, never the code itself. You will see the plaintext once, when it is issued.</span></div>`,

  features: w => {
    const opts = FEATURE_OPTIONS[w.nature];
    return `
    <h2>What lives here?</h2>
    <p class="lede">Turn off what you do not need. You can change these later in Space settings.</p>
    ${opts.map(f => `
      <button class="toggle-row" aria-pressed="${w.features[f.k] !== false}" data-sp="wz-feature:${f.k}">
        <span class="tx"><span class="t" style="display:block">${f.t}</span><span class="s" style="display:block">${f.s}</span></span>
        <span class="sw"></span>
      </button>`).join('')}
    ${w.nature === 'marketplace' ? `<div class="ephemeral-note" style="margin-top:16px">${icon('shield')}<span>Payments in this Space are held in escrow until the buyer confirms delivery. Ming Wallet is in development mode — no real funds move.</span></div>` : ''}`;
  },

  review: w => `
    <h2>Ready?</h2>
    <p class="lede">One last look before this Space exists.</p>
    <div style="margin-top:18px">
      ${[
        ['Nature', NATURES[w.nature].label],
        ['Name', w.name],
        ['Purpose', w.description || '—'],
        ['Privacy', { private: 'Invitation only', approval: 'Invitation, with approval', discoverable: 'Discoverable nearby' }[w.privacy]],
        ['Approval', w.requireApproval ? 'Each person approved' : 'Anyone with the code'],
        ['Member limit', w.maxMembers ? w.maxMembers + ' people' : 'No limit'],
        ['Code expires', w.inviteTtlHours ? w.inviteTtlHours + ' hours' : 'Never'],
        ['Code uses', w.inviteMaxUses ? w.inviteMaxUses : 'Unlimited'],
        ['Your role', 'Owner']
      ].map(([k, v]) => `<div class="review-row"><span class="k">${k}</span><span class="v">${esc(String(v))}</span></div>`).join('')}
    </div>`
};

const FEATURE_OPTIONS = {
  business: [
    { k: 'announcements', t: 'Announcements', s: 'Pinned notices from admins' },
    { k: 'tasks', t: 'Tasks', s: 'Work items with an owner and a date' },
    { k: 'documents', t: 'Documents', s: 'Shared files and links' },
    { k: 'opportunities', t: 'Opportunities', s: 'Roles and briefs open to members' },
    { k: 'audit', t: 'Activity log', s: 'Who did what, kept permanently' }
  ],
  friendly: [
    { k: 'moments', t: 'Moments', s: 'Photos and small things worth sharing' },
    { k: 'polls', t: 'Polls', s: 'Settle an argument in ten seconds' },
    { k: 'events', t: 'Events', s: 'Plans with a time and a place' },
    { k: 'memories', t: 'Memories', s: 'Moments you choose to keep' }
  ],
  casual: [
    { k: 'now', t: 'Happening now', s: 'Posts that clear themselves' },
    { k: 'nearby', t: 'Nearby members', s: 'Who is close, by distance only' },
    { k: 'polls', t: 'Quick polls', s: 'Where are we going?' },
    { k: 'meet', t: 'Meeting point', s: 'Shared only with people who join' }
  ],
  silly: [
    { k: 'prompts', t: 'Daily prompt', s: 'A stupid question every morning' },
    { k: 'stickers', t: 'Sticker wall', s: 'React with nonsense' },
    { k: 'game', t: 'Mini-game', s: 'A scoreboard nobody asked for' }
  ],
  romantic: [
    { k: 'memories', t: 'Memories', s: 'A private timeline' },
    { k: 'plans', t: 'Plans', s: 'Dates and small ideas' },
    { k: 'lists', t: 'Shared lists', s: 'Places, films, someday things' },
    { k: 'milestones', t: 'Milestones', s: 'Dates that matter' }
  ],
  marketplace: [
    { k: 'listings', t: 'Listings', s: 'Members can list items for sale' },
    { k: 'escrow', t: 'Escrow', s: 'Funds held until delivery is confirmed' },
    { k: 'disputes', t: 'Dispute centre', s: 'Evidence-based resolution' },
    { k: 'pickup', t: 'Pickup', s: 'Hand over in person as well as ship' }
  ]
};

$('#wz-close').addEventListener('click', () => popStack());
$('#wz-back').addEventListener('click', () => {
  const w = sp.wizard;
  captureWizardInputs();
  if (w.i > 0) { w.i--; w.dir = -1; renderWizard(); }
});
$('#wz-next').addEventListener('click', async () => {
  const w = sp.wizard;
  captureWizardInputs();
  if (WZ_STEPS[w.i] !== 'review') {
    if (!wzValid(WZ_STEPS[w.i], w)) return;
    w.i++; w.dir = 1; renderWizard();
    return;
  }
  const res = await Server.submit('space.create', {
    name: w.name, description: w.description, nature: w.nature,
    privacy: w.nature === 'romantic' ? 'private' : w.privacy,
    requireApproval: w.privacy === 'approval' || w.requireApproval,
    maxMembers: w.maxMembers, hue: w.hue, locationLinked: w.locationLinked,
    ttlDays: w.ttlDays, features: w.features,
    inviteTtlHours: w.inviteTtlHours || null, inviteMaxUses: w.inviteMaxUses || null
  });
  if (!res.ok) { toast(res.error, 'x'); return; }
  sp.shownCodes[res.data.space.id] = res.data.code;
  seedNewSpace(res.data.space);
  popStack();
  renderSpaces();
  toast('Space created', 'check');
  setTimeout(() => { openSpace(res.data.space.id); setTimeout(() => openInviteSheet(res.data.space.id, true), 420); }, 260);
});

function captureWizardInputs() {
  const w = sp.wizard;
  const name = $('#wz-name'); if (name) w.name = name.value;
  const desc = $('#wz-desc'); if (desc) w.description = desc.value;
  const max = $('#wz-max'); if (max) w.maxMembers = parseInt(max.value, 10) || null;
  const ttl = $('#wz-ttl'); if (ttl) w.ttlDays = parseInt(ttl.value, 10) || null;
}
$('#wz-body').addEventListener('input', e => {
  if (e.target.id === 'wz-name') $('#wz-next').disabled = e.target.value.trim().length < 2;
});

/* ============================================================
   INVITATIONS
============================================================ */
function openInviteSheet(spaceId, fresh = false) {
  const s = spaceById(spaceId);
  const inv = Server.db.invites.find(i => i.spaceId === spaceId && !i.revoked);
  const code = sp.shownCodes[spaceId];
  const owner = Server.can(spaceId, 'space.invite.rotate');

  openSheet({
    title: fresh ? 'Your Space is live' : 'Invitation',
    sub: `${s.name} · ${NATURES[s.nature].label} · ${Server.memberCount(spaceId)} ${Server.memberCount(spaceId) === 1 ? 'member' : 'members'}`,
    body: `
      <div class="code-card">
        <div class="lbl">Invitation code</div>
        <div class="code">${code ? esc(code) : '···· ····'}</div>
        <div class="meta">${code ? '' : 'Only shown once at issue. Regenerate to get a new one.<br>'}
          ${inv ? `${inv.expiresAt ? 'Expires ' + new Date(inv.expiresAt).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'No expiry'} ·
          ${inv.maxUses ? `${inv.uses}/${inv.maxUses} uses` : `${inv.uses} uses`} · version ${inv.version}` : 'No active code'}</div>
      </div>
      <div style="display:flex;gap:9px;margin-top:14px">
        <button class="btn btn--soft btn--sm" style="flex:1" data-sp="copy-code:${spaceId}" ${code ? '' : 'disabled'}>${icon('sp-copy')}Copy</button>
        <button class="btn btn--soft btn--sm" style="flex:1" data-sp="share-code:${spaceId}" ${code ? '' : 'disabled'}>${icon('send')}Share</button>
        ${owner ? `<button class="btn btn--soft btn--sm" style="flex:1" data-sp="rotate-code:${spaceId}">${icon('sp-refresh')}New code</button>` : ''}
      </div>
      <div class="ephemeral-note" style="margin-top:16px">${icon('shield')}<span>Ming keeps only a hash of this code. Regenerating revokes the current one immediately — anyone still holding it is locked out.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" data-action="close-sheet">Done</button>`
  });
}

function openJoinSheet() {
  openSheet({
    title: 'Join a Space',
    sub: 'Enter the code someone sent you.',
    body: `<div class="field"><label for="join-code">Invitation code</label>
      <input id="join-code" type="text" placeholder="M7K9-XP42" autocapitalize="characters" spellcheck="false"
        style="text-transform:uppercase;letter-spacing:.1em;font-size:18px" /></div>
      <div class="ephemeral-note">${icon('lock')}<span>Codes are checked on the server. Wrong or revoked codes tell you nothing about the Space.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" data-sp="join-submit">Join</button>`
  });
  setTimeout(() => $('#join-code').focus(), 260);
}

/* ============================================================
   SPACE SHELL
============================================================ */
function openSpace(id, tab) {
  const s = spaceById(id);
  if (!s) return;
  sp.activeId = id;
  sp.tab = tab || NATURES[s.nature].tabs[0][0];
  const screen = $('#screen-space');
  screen.dataset.nature = s.nature;
  renderSpace();
  pushStack('space');
}

function renderSpace() {
  const s = spaceById(sp.activeId);
  const n = NATURES[s.nature];
  $('#sp-head').innerHTML = HEADERS[s.nature](s);
  $('#sp-tabs').innerHTML = n.tabs.map(([k, label, ic]) => `
    <button class="${sp.tab === k ? 'on' : ''}" data-sp="tab:${k}" aria-current="${sp.tab === k}">
      ${icon(ic)}<span>${label}</span></button>`).join('');
  $('#sp-body').innerHTML = VIEWS[s.nature][sp.tab](s);
  $('#sp-scroll').scrollTop = 0;
}
function refreshSpace() {
  const s = spaceById(sp.activeId);
  $('#sp-body').innerHTML = VIEWS[s.nature][sp.tab](s);
}

function spBar(s, opts = {}) {
  return `<div class="sp-bar">
    <button class="back" data-back aria-label="Leave Space">${icon('back')}</button>
    <div class="ttl"><div class="n">${esc(s.name)}</div>
      <div class="m">${opts.meta || `${NATURES[s.nature].label} · ${Server.memberCount(s.id)} members`}</div></div>
    <button class="ic" data-sp="invite:${s.id}" aria-label="Invitation">${icon('sp-key')}</button>
    <button class="ic" data-sp="settings:${s.id}" aria-label="Space settings">${icon('settings')}</button>
  </div>`;
}

const HEADERS = {
  business: s => spBar(s) + `
    <div class="biz-metrics">
      <div><div class="v">${contentOf(s.id, 'task').filter(t => !t.done).length}</div><div class="k">Open tasks</div></div>
      <div><div class="v">${Server.memberCount(s.id)}</div><div class="k">Members</div></div>
      <div><div class="v">${contentOf(s.id, 'opportunity').length}</div><div class="k">Open roles</div></div>
    </div>`,

  friendly: s => `<div class="sp-cover" style="background:${coverFor(s)}">${spBar(s)}</div>`,

  casual: s => spBar(s, { meta: `${NATURES[s.nature].label}${s.expiresAt ? ' · closes ' + new Date(s.expiresAt).toLocaleDateString([], { day: 'numeric', month: 'short' }) : ''}` }) +
    `<div class="live-bar"><span class="live-dot"></span> ${contentOf(s.id, 'now').length} things happening${s.locationLinked && hasLocation() ? ` · ${esc(areaLabel())}` : ''}</div>`,

  silly: s => spBar(s, { meta: `Silly · ${Server.memberCount(s.id)} idiots` }),

  romantic: s => spBar(s, { meta: 'Private' }) + `
    <div class="rom-hero">
      <h2>${esc(s.name)}</h2>
      <p>${esc(s.description || 'Just the two of you.')}</p>
    </div>`,

  marketplace: s => spBar(s, { meta: `Marketplace · ${Server.db.products.filter(p => p.spaceId === s.id && p.status === 'listed').length} listings` })
};

function coverFor(s) {
  return s.hue === null || s.hue === undefined
    ? NATURES[s.nature].swatch
    : `linear-gradient(140deg,hsl(${s.hue} 42% 74%),hsl(${(s.hue + 320) % 360} 38% 42%))`;
}

/* ============================================================
   BUSINESS
============================================================ */
const VIEWS = { business: {}, friendly: {}, casual: {}, silly: {}, romantic: {}, marketplace: {} };

VIEWS.business.brief = s => {
  const notes = contentOf(s.id, 'announcement');
  const opps = contentOf(s.id, 'opportunity');
  return `
  <div class="sp-sec"><h3>Announcements ${Server.can(s.id, 'space.post.pin') ? `<span><button data-sp="new:announcement">Post</button></span>` : ''}</h3>
    ${notes.length ? notes.map(a => `
      <div class="sp-card ${a.pinned ? 'pinned' : ''}">
        <div style="font-size:14.5px;font-weight:580;letter-spacing:-.018em">${esc(a.title)}</div>
        <p style="font-size:13.5px;color:var(--muted);margin-top:6px;line-height:1.5">${esc(a.body)}</p>
        <div style="font-size:11.5px;color:var(--muted);margin-top:10px">${esc(nameOf(a.authorId))} · ${esc(timeAgo(a.at))}</div>
      </div>`).join('') : spEmpty('Nothing announced yet.', Server.can(s.id, 'space.post.pin') ? { t: 'Post the first one', a: 'new:announcement' } : null)}
  </div>
  <div class="sp-sec"><h3>Open roles</h3>
    ${opps.length ? opps.map(o => `
      <div class="sp-card">
        <div style="font-size:14.5px;font-weight:560">${esc(o.title)}</div>
        <p style="font-size:13px;color:var(--muted);margin-top:5px;line-height:1.45">${esc(o.body)}</p>
        <div style="margin-top:12px"><button class="btn btn--soft btn--sm" data-sp="apply:${o.id}">Express interest</button></div>
      </div>`).join('') : spEmpty('No roles open.')}
  </div>
  <div class="sp-sec"><h3>Documents</h3>
    ${contentOf(s.id, 'doc').map(d => `
      <div class="sp-card" style="display:flex;align-items:center;gap:12px">
        ${icon('sp-doc')}<div style="flex:1"><div style="font-size:14px">${esc(d.title)}</div>
        <div style="font-size:11.5px;color:var(--muted)">${esc(d.meta)}</div></div><span class="go">${icon('chev')}</span>
      </div>`).join('') || spEmpty('No documents shared.')}
  </div>`;
};

VIEWS.business.work = s => {
  const tasks = contentOf(s.id, 'task');
  const open = tasks.filter(t => !t.done), done = tasks.filter(t => t.done);
  return `
  <div class="sp-sec"><h3>Tasks <span><button data-sp="new:task">Add</button></span></h3>
    <div class="sp-card">
      ${open.length ? open.map(taskRow).join('') : `<p style="font-size:13.5px;color:var(--muted);padding:6px 0">Nothing open. Rare and suspicious.</p>`}
      ${done.length ? `<div style="font-size:11.5px;color:var(--muted);padding:12px 0 4px">Done (${done.length})</div>${done.map(taskRow).join('')}` : ''}
    </div>
  </div>`;
};
const taskRow = t => `
  <button class="task" aria-pressed="${!!t.done}" data-sp="task:${t.id}">
    <span class="box">${icon('check')}</span>
    <span><span class="t" style="display:block">${esc(t.title)}</span>
    <span class="s" style="display:block">${esc(t.owner)} · ${esc(t.due)}</span></span>
  </button>`;

VIEWS.business.people = s => membersView(s, 'Roles decide what each person can do. Changes are enforced on the server.');
VIEWS.business.log = s => `
  <div class="sp-sec"><h3>Activity log <span>Append-only</span></h3>
    <div class="sp-card">
      ${Server.auditFor(s.id).map(a => `
        <div class="audit"><b>${esc(nameOf(a.actor))}</b> ${esc(a.event.replace(/[._]/g, ' '))}
        <div style="opacity:.7">${esc(new Date(a.at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</div></div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--muted);padding:4px 2px">Entries cannot be edited or deleted, including by the owner.</p>
  </div>`;

/* ============================================================
   FRIENDLY
============================================================ */
VIEWS.friendly.home = s => {
  const members = Server.db.members.filter(m => m.spaceId === s.id);
  const polls = contentOf(s.id, 'poll');
  const events = contentOf(s.id, 'event');
  return `
  <div class="friend-strip">
    ${members.map(m => {
      const p = personOf(m.userId);
      return `<button data-sp="member:${m.userId}">${avatar(p, 56)}<div class="nm">${esc(p.short || 'You')}</div></button>`;
    }).join('')}
  </div>
  <div class="sp-sec"><h3>Today <span><button data-sp="new:moment">Share</button></span></h3>
    ${contentOf(s.id, 'moment').slice(0, 2).map(momentCard).join('') || spEmpty('Quiet in here.', { t: 'Share something', a: 'new:moment' })}
  </div>
  ${polls.length ? `<div class="sp-sec"><h3>Settle it</h3>${polls.map(pollCard).join('')}</div>` : ''}
  ${events.length ? `<div class="sp-sec"><h3>Coming up</h3>${events.map(eventCard).join('')}</div>` : ''}`;
};
VIEWS.friendly.moments = s => `
  <div class="sp-sec"><h3>Moments <span><button data-sp="new:moment">Share</button></span></h3>
    ${contentOf(s.id, 'moment').map(momentCard).join('') || spEmpty('No moments yet.', { t: 'Share the first', a: 'new:moment' })}</div>`;
VIEWS.friendly.events = s => `
  <div class="sp-sec"><h3>Events <span><button data-sp="new:event">Plan</button></span></h3>
    ${contentOf(s.id, 'event').map(eventCard).join('') || spEmpty('Nothing planned.', { t: 'Plan something', a: 'new:event' })}</div>`;
VIEWS.friendly.people = s => membersView(s, 'Everyone here was invited by someone.');

const REACTS = [['love', '♥'], ['ha', 'ha'], ['same', 'same'], ['wow', 'wow']];
const momentCard = m => `
  <div class="moment">
    <div class="art" style="background:linear-gradient(155deg,hsl(${m.hue} 40% 80%),hsl(${(m.hue + 320) % 360} 36% 52%))">
      <span style="background:rgba(255,253,249,.9);border-radius:99px;padding:4px 10px 4px 4px;font-size:11.5px;font-weight:550;display:inline-flex;align-items:center;gap:6px">
        ${avatar(personOf(m.authorId), 28, { status: false })}${esc(nameOf(m.authorId))}</span>
    </div>
    <div class="cap">${esc(m.text)}</div>
    <div class="reacts">
      ${REACTS.map(([k, label]) => `<button class="react ${m.mine && m.mine[k] ? 'on' : ''}" data-sp="react:${m.id}:${k}">${label} ${(m.reacts && m.reacts[k]) || 0}</button>`).join('')}
    </div>
  </div>`;
const pollCard = p => {
  const total = p.options.reduce((n, o) => n + o.votes, 0) || 1;
  return `<div class="sp-card">
    <div style="font-size:14.5px;font-weight:560">${esc(p.question)}</div>
    <div class="poll" style="margin-top:10px">
      ${p.options.map((o, i) => `
        <button class="${p.voted === i ? 'picked' : ''}" data-sp="vote:${p.id}:${i}">
          <span class="fill" style="width:${p.voted === null || p.voted === undefined ? 0 : Math.round(o.votes / total * 100)}%"></span>
          <span class="lb"><span>${esc(o.t)}</span><span>${p.voted === null || p.voted === undefined ? '' : Math.round(o.votes / total * 100) + '%'}</span></span>
        </button>`).join('')}
    </div>
    <div style="font-size:11.5px;color:var(--muted)">${total} ${total === 1 ? 'vote' : 'votes'}</div>
  </div>`;
};
const eventCard = e => `
  <div class="sp-card" style="display:flex;gap:14px;align-items:center">
    <div style="text-align:center;min-width:46px">
      <div style="font-size:17px;font-weight:620;letter-spacing:-.02em">${esc(e.day)}</div>
      <div style="font-size:11px;color:var(--muted)">${esc(e.month)}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:14.5px;font-weight:555">${esc(e.title)}</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:2px">${esc(e.where)} · ${esc(e.time)}</div>
    </div>
    <button class="btn btn--soft btn--sm" data-sp="rsvp:${e.id}">${e.going ? 'Going' : 'Join'}</button>
  </div>`;

/* ============================================================
   CASUAL
============================================================ */
VIEWS.casual.now = s => `
  <div class="sp-sec"><h3>Happening now <span><button data-sp="new:now">Post</button></span></h3>
    ${contentOf(s.id, 'now').map(c => `
      <div class="sp-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          ${avatar(personOf(c.authorId), 28, { status: false })}
          <span style="font-size:12.5px;font-weight:540">${esc(nameOf(c.authorId))}</span>
          <span class="ephem" style="margin-left:auto">${icon('clock')}${Math.max(1, Math.round((c.at + 6 * 36e5 - Date.now()) / 36e5))}h left</span>
        </div>
        <div style="font-size:14.5px;line-height:1.45">${esc(c.text)}</div>
      </div>`).join('') || spEmpty('Nothing yet. Casual Spaces clear themselves every few hours.', { t: 'Post something', a: 'new:now' })}
  </div>
  ${contentOf(s.id, 'poll').map(pollCard).join('')}
  <div class="sp-sec"><h3>Meeting point</h3>
    <div class="sp-card">
      <div style="font-size:14.5px;font-weight:555">${esc(contentOf(s.id, 'meet')[0] ? contentOf(s.id, 'meet')[0].title : 'Not set')}</div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.5">Shared only with people who have joined this Space. Never posted publicly.</p>
    </div>
  </div>`;

VIEWS.casual.around = s => {
  if (!hasLocation()) {
    return `<div class="sp-sec"><h3>Around</h3>${spEmpty('Location is off. Turn on location access to see who is close.', { t: 'Turn on location', a: 'loc' })}</div>`;
  }
  const near = people.filter(p => p.km !== null).sort((a, b) => a.km - b.km).slice(0, 6);
  return `<div class="sp-sec"><h3>Members nearby <span>${esc(areaLabel())}</span></h3>
    <div class="sp-card">
      ${near.map(p => `<div class="mrow">${avatar(p, 40)}
        <div class="m"><div class="n">${esc(p.short)}</div><div class="s">${esc(p.tag)}</div></div>
        <span class="dist-chip">${esc(distLabel(p.km))}</span></div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--muted);padding:6px 2px">Distances come from your device. No coordinates are shared with anyone in this Space.</p>
  </div>`;
};
VIEWS.casual.people = s => membersView(s, 'Casual Spaces can close themselves on a date you set.');

/* ============================================================
   SILLY
============================================================ */
const STICKERS = ['🥔', '🦆', '🛸', '🧦', '🐌', '📎', '🫠', '🥁'];
VIEWS.silly.chaos = s => {
  const prompt = contentOf(s.id, 'prompt')[0];
  return `
  <div style="padding:14px 0 0">
    <div class="prompt">
      <div class="k">Prompt of the day</div>
      <h4>${esc(prompt ? prompt.title : 'Say something indefensible')}</h4>
      <div style="margin-top:14px"><button class="btn btn--primary btn--sm" data-sp="new:answer">Answer it</button></div>
    </div>
  </div>
  <div class="sp-sec"><h3>Answers</h3>
    ${contentOf(s.id, 'answer').map(a => `
      <div class="sp-card">
        <div style="font-size:15px;line-height:1.4;font-weight:600">${esc(a.text)}</div>
        <div style="font-size:11.5px;margin-top:9px">— ${esc(nameOf(a.authorId))}</div>
      </div>`).join('') || spEmpty('Nobody has embarrassed themselves yet.', { t: 'Go first', a: 'new:answer' })}
  </div>`;
};
VIEWS.silly.wall = s => `
  <div class="sp-sec"><h3>Sticker wall <span>Tap to throw</span></h3></div>
  <div class="stickers">${STICKERS.map((e, i) => `<button class="sticker" data-sp="sticker:${i}" aria-label="Throw sticker">${e}</button>`).join('')}</div>
  <div class="sp-sec"><h3>Thrown</h3>
    <div class="sp-card">${contentOf(s.id, 'sticker').slice(0, 12).map(c => `
      <div class="scoreline"><span>${c.emoji} ${esc(nameOf(c.authorId))}</span><span style="color:var(--muted);font-size:12px">${esc(timeAgo(c.at))}</span></div>`).join('')
      || '<p style="font-size:13.5px;color:var(--muted)">The wall is clean. Fix that.</p>'}</div>
  </div>`;
VIEWS.silly.game = s => {
  const scores = contentOf(s.id, 'score').sort((a, b) => b.score - a.score);
  return `
  <div class="sp-sec"><h3>Hold the button</h3>
    <div class="sp-card" style="text-align:center;padding:24px 18px">
      <div style="font-size:13px;color:var(--muted)">Press and hold. Let go at exactly 5.00 seconds.</div>
      <div id="game-clock" style="font-size:44px;font-weight:800;letter-spacing:-.04em;margin:12px 0">0.00</div>
      <button class="btn btn--primary btn--block" id="game-btn">Hold</button>
    </div>
  </div>
  <div class="sp-sec"><h3>Scoreboard</h3>
    <div class="sp-card">${scores.length ? scores.map((c, i) => `
      <div class="scoreline"><span>${i + 1}. ${esc(nameOf(c.authorId))}</span><b>${c.score.toFixed(2)}s</b></div>`).join('')
      : '<p style="font-size:13.5px;color:var(--muted)">No scores. Cowards.</p>'}</div>
  </div>`;
};
VIEWS.silly.people = s => membersView(s, 'Everyone here can be removed by the owner, instantly, for any reason.');

/* ============================================================
   ROMANTIC
============================================================ */
VIEWS.romantic.us = s => {
  const plan = contentOf(s.id, 'plan')[0];
  const ms = contentOf(s.id, 'milestone');
  return `
  <div class="sp-sec"><h3>Next</h3>
    <div class="sp-card">
      ${plan ? `<div style="font-size:16px">${esc(plan.title)}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:6px">${esc(plan.when)} · ${esc(plan.where)}</div>`
        : '<p style="font-size:13.5px;color:var(--muted)">Nothing planned. That is also allowed.</p>'}
      <div style="margin-top:14px"><button class="btn btn--soft btn--sm" data-sp="new:plan">Add a plan</button></div>
    </div>
  </div>
  <div class="sp-sec"><h3>Lately</h3>
    ${contentOf(s.id, 'memory').slice(0, 3).map(m => `
      <div class="sp-card"><div style="font-size:14.5px;line-height:1.55">${esc(m.text)}</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:8px">${esc(m.when)}</div></div>`).join('')
      || spEmpty('Nothing kept yet.', { t: 'Write something', a: 'new:memory' })}
  </div>
  ${ms.length ? `<div class="sp-sec"><h3>Dates that matter</h3><div class="sp-card">
    ${ms.map(m => `<div class="milestone"><span class="d">${esc(m.d)}</span><span>${esc(m.title)}</span></div>`).join('')}
  </div></div>` : ''}
  <div class="privacy-seal">${icon('lock')}
    <span>This Space is invitation only and never appears in Discover. Nothing here is counted, ranked or shown anywhere else in Ming.</span></div>`;
};
VIEWS.romantic.memories = s => `
  <div class="sp-sec"><h3>Memories <span><button data-sp="new:memory">Keep one</button></span></h3>
    <div class="sp-card">
      ${contentOf(s.id, 'memory').map(m => `
        <div class="memory"><span class="when">${esc(m.when)}</span><span class="tx">${esc(m.text)}</span></div>`).join('')
        || '<p style="font-size:13.5px;color:var(--muted)">Nothing yet.</p>'}
    </div>
  </div>`;
VIEWS.romantic.plans = s => `
  <div class="sp-sec"><h3>Plans <span><button data-sp="new:plan">Add</button></span></h3>
    ${contentOf(s.id, 'plan').map(p => `
      <div class="sp-card"><div style="font-size:15px">${esc(p.title)}</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:5px">${esc(p.when)} · ${esc(p.where)}</div></div>`).join('')
      || spEmpty('No plans yet.', { t: 'Add one', a: 'new:plan' })}
  </div>`;
VIEWS.romantic.lists = s => `
  <div class="sp-sec"><h3>Shared lists</h3>
    ${contentOf(s.id, 'list').map(l => `
      <div class="sp-card">
        <div style="font-size:15px;margin-bottom:8px">${esc(l.title)}</div>
        ${l.items.map((it, i) => `
          <button class="check" aria-pressed="${it.done}" data-sp="listtoggle:${l.id}:${i}" style="padding:7px 0">
            <span class="box">${icon('check')}</span><span class="lb">${esc(it.t)}</span></button>`).join('')}
        <button class="btn btn--soft btn--sm" style="margin-top:10px" data-sp="listadd:${l.id}">Add to list</button>
      </div>`).join('')}
  </div>`;

/* ============================================================
   MARKETPLACE
============================================================ */
VIEWS.marketplace.market = s => {
  const prods = Server.db.products.filter(p => p.spaceId === s.id && (sp.marketTab === 'all' || p.category === sp.marketTab));
  const cats = ['all', ...new Set(Server.db.products.filter(p => p.spaceId === s.id).map(p => p.category))];
  const isSeller = Server.can(s.id, 'product.create');
  return `
  <div style="padding:12px 16px 10px">
    <div class="searchbar"><svg><use href="#i-search"/></svg>
      <input id="mk-search" type="text" placeholder="Search listings" aria-label="Search listings" /></div>
  </div>
  <div class="chips">${cats.map(c => `<button class="chip ${sp.marketTab === c ? 'is-on' : ''}" data-sp="mkcat:${c}">${c === 'all' ? 'Everything' : esc(c)}</button>`).join('')}</div>
  <div class="sp-sec"><h3>Listings <span>${prods.length}</span></h3></div>
  <div class="mk-grid" id="mk-grid">${prods.map(productCard).join('') || `<div style="grid-column:1/-1">${spEmpty('Nothing listed yet.', isSeller ? { t: 'List an item', a: 'new:product' } : null)}</div>`}</div>
  ${isSeller ? `<div style="padding:16px"><button class="btn btn--primary btn--block" data-sp="new:product">${icon('plus')}List an item</button></div>` : `
    <div style="padding:16px"><div class="sp-card"><div style="font-size:14px;font-weight:550">Want to sell here?</div>
    <p style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">Sellers are approved by a moderator. Listing without the seller role is rejected by the server, not hidden in the app.</p>
    <button class="btn btn--soft btn--sm" style="margin-top:12px" data-sp="ask-seller">Request seller role</button></div></div>`}
  <div style="padding:0 16px 8px"><div class="sp-card" style="display:flex;gap:11px">
    ${icon('shield')}<p style="font-size:12.5px;color:var(--muted);line-height:1.5">Every purchase here is held in escrow until you confirm delivery. Ming Wallet is in development mode — no real money moves.</p>
  </div></div>`;
};

const productCard = p => `
  <button class="mk-prod" data-sp="product:${p.id}">
    <span class="art" style="display:block;background:linear-gradient(150deg,hsl(${p.hue} 30% 86%),hsl(${(p.hue + 40) % 360} 26% 62%))">
      <span class="cond">${esc(p.condition)}</span>
    </span>
    <span class="b" style="display:block">
      <span class="n" style="display:block">${esc(p.title)}</span>
      <span class="p" style="display:block">${esc(money(p.price, p.asset))}</span>
      <span class="s" style="display:block">${esc(nameOf(p.sellerId))}${p.status === 'sold' ? ' · sold' : ''}</span>
    </span>
  </button>`;

VIEWS.marketplace.orders = s => {
  const mine = Server.db.orders.filter(o => o.spaceId === s.id &&
    (o.buyerId === Server.session.userId || o.sellerId === Server.session.userId));
  return `<div class="sp-sec"><h3>Your orders <span>${mine.length}</span></h3>
    ${mine.length ? mine.map(o => {
      const st = ORDER_STATES[o.status];
      const prod = Server.db.products.find(x => x.id === o.productId);
      return `<button class="sp-card" style="display:block;width:100%;text-align:left" data-sp="order:${o.id}">
        <div style="display:flex;gap:12px;align-items:center">
          <div style="flex:1"><div style="font-size:14.5px;font-weight:555">${esc(prod ? prod.title : 'Listing removed')}</div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:3px">${esc(o.id)} · ${esc(o.buyerId === Server.session.userId ? 'buying from ' + nameOf(o.sellerId) : 'selling to ' + nameOf(o.buyerId))}</div></div>
          <div style="text-align:right"><div style="font-weight:600;font-variant-numeric:tabular-nums">${esc(money(o.total, o.asset))}</div></div>
        </div>
        <div style="margin-top:10px"><span class="state-pill ${st.cls}">${esc(st.t)}</span></div>
      </button>`;
    }).join('') : spEmpty('No orders yet.')}
  </div>`;
};

VIEWS.marketplace.sellers = s => {
  const sellers = Server.db.members.filter(m => m.spaceId === s.id && ['seller', 'owner'].includes(m.role));
  return `<div class="sp-sec"><h3>Sellers</h3>
    ${sellers.map(m => {
      const p = personOf(m.userId);
      const sold = Server.db.orders.filter(o => o.sellerId === m.userId && o.status === 'completed').length;
      const disputes = Server.db.disputes.filter(d => {
        const o = Server.db.orders.find(x => x.id === d.orderId); return o && o.sellerId === m.userId;
      }).length;
      return `<div class="sp-card">
        <div class="mrow" style="padding:0">${avatar(p, 44)}
          <div class="m"><div class="n">${esc(p.short || p.name)}</div>
          <div class="s">${sold} completed · ${disputes} disputes · joined ${esc(timeAgo(m.joinedAt))}</div></div>
        </div>
        <div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">
          <span class="trust">${icon('check')}Ming member</span>
          ${sold >= 2 ? `<span class="trust">${icon('sp-box')}${sold} settled sales</span>` : `<span class="trust warn">${icon('clock')}New seller</span>`}
          <span class="trust warn">${icon('shield')}Identity not verified</span>
        </div>
      </div>`;
    }).join('')}
    <p style="font-size:12px;color:var(--muted);padding:4px 2px;line-height:1.5">Trust signals are facts Ming can actually check. Identity verification needs a provider that is not connected yet, so no seller here is shown as verified.</p>
  </div>`;
};

VIEWS.marketplace.cases = s => {
  const ds = Server.db.disputes.filter(d => d.spaceId === s.id);
  return `<div class="sp-sec"><h3>Dispute centre <span>${ds.length} open</span></h3>
    ${ds.length ? ds.map(d => {
      const o = Server.db.orders.find(x => x.id === d.orderId);
      return `<button class="sp-card" style="display:block;width:100%;text-align:left" data-sp="order:${d.orderId}">
        <div style="font-size:14px;font-weight:555">${esc(d.reason)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${esc(d.orderId)} · opened ${esc(timeAgo(d.openedAt))} by ${esc(nameOf(d.openedBy))}</div>
        <div style="margin-top:10px"><span class="state-pill disputed">Funds held · ${Server.evidenceFor(d.id).length} pieces of evidence</span></div>
      </button>`;
    }).join('') : spEmpty('No disputes. Funds move only when a buyer confirms.')}
    <div class="sp-card" style="margin-top:4px">
      <div style="font-size:14px;font-weight:550">How a dispute is decided</div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.55">Opening a dispute does not refund anyone. It freezes the money where it already is — held by Ming — and opens a 96-hour window for both sides to submit evidence. A moderator reviews the order timeline, the delivery record, the messages and both submissions, then releases, refunds or splits. Nothing is automatic in either direction.</p>
    </div>
  </div>`;
};

/* ---- product detail + checkout ---- */
function openProduct(id) {
  const p = Server.db.products.find(x => x.id === id);
  const s = spaceById(p.spaceId);
  const seller = personOf(p.sellerId);
  const sold = Server.db.orders.filter(o => o.sellerId === p.sellerId && o.status === 'completed').length;
  openSheet({
    title: p.title,
    sub: `${money(p.price, p.asset)} · ${p.condition} · ${p.handover}`,
    body: `
      <div style="height:150px;border-radius:14px;margin:4px 0 14px;background:linear-gradient(150deg,hsl(${p.hue} 30% 86%),hsl(${(p.hue + 40) % 360} 26% 60%))"></div>
      <p style="font-size:14px;line-height:1.55">${esc(p.description)}</p>
      <div style="display:flex;gap:7px;margin-top:14px;flex-wrap:wrap">
        <span class="trust">${icon('shield')}Escrow protected</span>
        ${sold >= 2 ? `<span class="trust">${icon('check')}${sold} settled sales</span>` : `<span class="trust warn">${icon('clock')}New seller</span>`}
        <span class="trust">${icon('sp-box')}${p.qty} in stock</span>
      </div>
      <div class="mrow" style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        ${avatar(seller, 40)}<div class="m"><div class="n">${esc(seller.short || seller.name)}</div>
        <div class="s">Seller · ${esc(s.name)}</div></div>
        <button class="btn btn--soft btn--sm" data-sp="msg-seller:${p.sellerId}">Message</button>
      </div>`,
    foot: p.sellerId === Server.session.userId
      ? `<button class="btn btn--soft btn--block" data-action="close-sheet">This is your listing</button>`
      : `<button class="btn btn--primary btn--block" data-sp="buy:${p.id}">Buy · ${esc(money(p.price, p.asset))}</button>`
  });
}

function openCheckout(productId) {
  const p = Server.db.products.find(x => x.id === productId);
  const acct = Server.account(Server.session.userId, 'USDT');
  const fee = Math.round(p.price * 0.015 * 100) / 100;
  openSheet({
    title: 'Checkout',
    sub: `${p.title} · ${money(p.price, p.asset)}`,
    body: `
      <div class="sp-card" style="background:var(--surface-2);border:0">
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0"><span>Item</span><b>${esc(money(p.price))}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);padding:4px 0"><span>Ming fee, paid by seller</span><span>${esc(money(fee))}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;padding:8px 0 2px;border-top:1px solid var(--border);margin-top:6px"><b>You pay</b><b>${esc(money(p.price))}</b></div>
      </div>
      <div class="field"><label>Pay from</label>
        <div class="pick">
          <button type="button" aria-pressed="true">USDT · ${esc(acct.available.toFixed(2))} available</button>
          <button type="button" aria-pressed="false" disabled>BTC</button>
        </div>
      </div>
      <div class="ephemeral-note">${icon('shield')}<span>Your payment is held by Ming, not sent to the seller. It is released when you confirm delivery, or refunded if the dispute goes your way.</span></div>
      <div class="dev-banner" style="margin:14px 0 0;color:#8A5310;background:rgba(214,150,40,.1);border-color:rgba(214,150,40,.28)">
        ${icon('flag')}<span>Development mode. Balances are internal test figures, there is no custody provider connected and nothing settles on a blockchain.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" data-sp="pay:${p.id}">Place order and hold ${esc(money(p.price))}</button>`
  });
}

/* ---- order detail: the escrow lifecycle ---- */
function openOrder(id) {
  sp.activeOrder = id;
  const o = Server.db.orders.find(x => x.id === id);
  const s = spaceById(o.spaceId);
  $('#screen-order').dataset.nature = s.nature;
  renderOrder();
  pushStack('order');
}

function renderOrder() {
  const o = Server.db.orders.find(x => x.id === sp.activeOrder);
  const prod = Server.db.products.find(x => x.id === o.productId);
  const party = Server.partyOf(o);
  const st = ORDER_STATES[o.status];
  const dispute = Server.db.disputes.find(d => d.orderId === o.id);
  const events = Server.orderEvents(o.id);
  const reached = new Set(events.map(e => e.to));
  const idx = FLOW_ORDER.indexOf(o.status);

  $('#ord-title').textContent = prod ? prod.title : 'Order';
  $('#ord-sub').textContent = `${o.id} · ${money(o.total, o.asset)}`;

  const actions = Object.entries(Server.ORDER_FLOW[o.status] || {})
    .filter(([, rule]) => party && rule.who.includes(party))
    .map(([t]) => t);

  $('#ord-body').innerHTML = `
    <div class="sp-sec">
      <div class="sp-card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1"><div style="font-size:15px;font-weight:570">${esc(prod ? prod.title : 'Listing removed')}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${esc(party === 'buyer' ? 'From ' + nameOf(o.sellerId) : party === 'seller' ? 'To ' + nameOf(o.buyerId) : 'Reviewing as moderator')}</div></div>
          <div style="font-weight:650;font-variant-numeric:tabular-nums">${esc(money(o.total, o.asset))}</div>
        </div>
        <div style="margin-top:12px"><span class="state-pill ${st.cls}">${esc(st.t)}</span></div>
        ${o.status === 'delivered' && o.acceptanceDeadline ? `<p style="font-size:12.5px;color:var(--muted);margin-top:10px;line-height:1.5">Accept or raise a problem before ${esc(new Date(o.acceptanceDeadline).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}. After that the platform releases the funds.</p>` : ''}
      </div>
    </div>

    <div class="sp-sec"><h3>Escrow</h3>
      <div class="sp-card">
        <div class="flow">
          ${FLOW_ORDER.map((k, i) => {
            const done = reached.has(k) || (idx > -1 && i < idx);
            const current = o.status === k;
            const ev = events.find(e => e.to === k);
            return `<div class="flow-step ${done ? 'done' : ''} ${current ? 'current' : ''} ${!done && !current ? 'pendingstep' : ''}">
              <span class="node">${icon('check')}</span>
              <span class="tx"><span class="t" style="display:block">${FLOW_COPY[k][0]}</span>
              <span class="s" style="display:block">${ev ? esc(nameOf(ev.actor)) + ' · ' + esc(timeAgo(ev.at)) : FLOW_COPY[k][1]}</span></span>
            </div>`;
          }).join('')}
        </div>
        ${['disputed', 'refunded', 'cancelled'].includes(o.status) ? `
          <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
            <span class="state-pill ${st.cls}">${esc(st.t)}</span>
            <p style="font-size:12.5px;color:var(--muted);margin-top:9px;line-height:1.5">${o.status === 'disputed'
              ? 'The money has not moved. It stays held by Ming until a moderator decides.'
              : o.status === 'refunded' ? 'Returned to the buyer’s wallet.' : 'The hold was released back to the buyer.'}</p>
          </div>` : ''}
      </div>
    </div>

    ${dispute ? renderDisputePanel(dispute, o, party) : ''}

    ${actions.length ? `<div style="padding:4px 16px 16px;display:flex;flex-direction:column;gap:9px">
      ${actions.map(t => `<button class="btn ${PRIMARY_TRANSITIONS.includes(t) ? 'btn--primary' : 'btn--soft'} btn--block" data-sp="trans:${o.id}:${t}">${TRANSITION_LABEL[t]}</button>`).join('')}
    </div>` : `<p style="font-size:12.5px;color:var(--muted);padding:4px 18px 18px;line-height:1.5">
      Nothing for you to do here right now. ${party === 'buyer' ? 'The seller has the next step.' : party === 'seller' ? 'Waiting on the buyer.' : ''}</p>`}

    <div class="sp-sec"><h3>Record</h3>
      <div class="sp-card">
        ${events.slice().reverse().map(e => `
          <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px">
            <span style="color:var(--muted);min-width:96px">${esc(new Date(e.at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</span>
            <span style="flex:1">${esc(nameOf(e.actor))} · ${esc(e.transition.replace(/_/g, ' '))}${e.from ? ` (${esc(e.from)} → ${esc(e.to)})` : ''}</span>
          </div>`).join('')}
        <p style="font-size:11.5px;color:var(--muted);margin-top:10px">Transaction ${esc(o.id)} · records are append-only and cannot be edited by either party.</p>
      </div>
    </div>`;
}

const TRANSITION_LABEL = {
  fund: 'Pay and hold funds',
  cancel: 'Cancel order',
  seller_confirm: 'Confirm the order',
  ship: 'Mark as handed over',
  confirm_delivery: 'I received it',
  accept: 'Accept and release funds',
  dispute: 'Report a problem',
  resolve_release: 'Resolve · release to seller',
  resolve_refund: 'Resolve · refund buyer'
};
const PRIMARY_TRANSITIONS = ['fund', 'seller_confirm', 'ship', 'confirm_delivery', 'accept'];

function renderDisputePanel(d, o, party) {
  const ev = Server.evidenceFor(d.id);
  return `<div class="sp-sec"><h3>Dispute</h3>
    <div class="sp-card">
      <div style="font-size:14.5px;font-weight:555">${esc(d.reason)}</div>
      <p style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.5">${esc(d.detail || '')}</p>
      <p style="font-size:12px;color:var(--muted);margin-top:10px">Opened by ${esc(nameOf(d.openedBy))} · evidence closes ${esc(new Date(d.evidenceDeadline).toLocaleDateString([], { day: 'numeric', month: 'short' }))}</p>
      <div style="margin-top:12px">
        ${ev.length ? ev.map(e => `<div class="evidence-item">${icon(e.kind === 'photo' ? 'sp-camera' : 'sp-doc')}
          <span style="flex:1">${esc(e.label)}</span><span class="who">${esc(e.party)}</span></div>`).join('')
          : '<p style="font-size:12.5px;color:var(--muted)">No evidence submitted yet.</p>'}
      </div>
      ${party ? `<button class="btn btn--soft btn--sm" style="margin-top:12px" data-sp="evidence:${d.id}">Add evidence</button>` : ''}
    </div>
  </div>`;
}

/* ============================================================
   WALLET
============================================================ */
function openWallet() { renderWallet(); pushStack('wallet'); }

function renderWallet() {
  const assets = ['USDT', 'BTC'].map(a => Server.account(Server.session.userId, a));
  const entries = Server.db.walletEntries.filter(e => e.userId === Server.session.userId).slice(0, 20);
  $('#wallet-body').innerHTML = `
    <div class="dev-banner">${icon('flag')}
      <span><b>Development mode.</b> These balances are internal test figures. No custody provider is connected, no address is watched and nothing here settles on a blockchain. Deposits and withdrawals are disabled until a regulated custodian is integrated.</span></div>

    <div style="padding:0 16px 8px">
      ${assets.map(a => `
        <div class="asset">
          <span class="sym">${a.asset === 'USDT' ? '₮' : '₿'}</span>
          <span class="m"><span class="n" style="display:block">${a.asset}</span>
          <span class="s" style="display:block">${a.held > 0 ? money(a.held, a.asset) + ' held in escrow' : 'Nothing held'}</span></span>
          <span class="amt"><span class="v" style="display:block">${esc(money(a.available, a.asset))}</span>
          <span class="s" style="display:block">available</span></span>
        </div>`).join('')}
    </div>

    <div style="display:flex;gap:9px;padding:14px 16px">
      <button class="btn btn--soft" style="flex:1" data-sp="wallet-blocked:Deposit">Deposit</button>
      <button class="btn btn--soft" style="flex:1" data-sp="wallet-blocked:Withdraw">Withdraw</button>
      <button class="btn btn--soft" style="flex:1" data-sp="wallet-blocked:Send">Send</button>
    </div>

    <div class="section">${sectionHead('Activity', 'Internal ledger')}
      ${entries.length ? entries.map(e => `
        <div class="ledger-row">
          <span class="m"><span style="display:block">${esc(e.note)}</span>
          <span class="s">${esc(new Date(e.at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}${e.ref ? ' · ' + esc(e.ref) : ''}</span></span>
          <span class="v ${e.amount < 0 ? 'out' : e.amount > 0 ? 'in' : ''}">${e.amount === 0 ? '—' : (e.amount > 0 ? '+' : '') + esc(money(e.amount, e.asset))}</span>
        </div>`).join('') : `<p style="padding:18px;color:var(--muted);font-size:13.5px">No activity yet.</p>`}
    </div>
    <p style="font-size:12px;color:var(--muted);padding:14px 18px 28px;line-height:1.6">
      Balances are derived from these entries rather than stored as a number, so every change has a record behind it.
      A production wallet adds withdrawal address allowlists, per-transaction limits, step-up authentication and an
      idempotency key on every write. Private keys never touch this app.</p>`;
}

/* ============================================================
   COMPOSERS (space-native content)
============================================================ */
const COMPOSERS = {
  announcement: { title: 'Post an announcement', fields: [['title', 'Headline', 'input'], ['body', 'Details', 'textarea']], kind: 'announcement' },
  task: { title: 'Add a task', fields: [['title', 'Task', 'input'], ['owner', 'Owner', 'input'], ['due', 'Due', 'input']], kind: 'task' },
  moment: { title: 'Share a moment', fields: [['text', 'What happened?', 'textarea']], kind: 'moment' },
  event: { title: 'Plan something', fields: [['title', 'What', 'input'], ['where', 'Where', 'input'], ['time', 'When', 'input']], kind: 'event' },
  now: { title: 'Happening now', fields: [['text', 'What is going on?', 'textarea']], kind: 'now' },
  answer: { title: 'Answer the prompt', fields: [['text', 'Go on then', 'textarea']], kind: 'answer' },
  memory: { title: 'Keep a memory', fields: [['text', 'What do you want to remember?', 'textarea'], ['when', 'When', 'input']], kind: 'memory' },
  plan: { title: 'Add a plan', fields: [['title', 'What', 'input'], ['when', 'When', 'input'], ['where', 'Where', 'input']], kind: 'plan' }
};

function openComposerFor(key) {
  const c = COMPOSERS[key];
  openSheet({
    title: c.title,
    sub: '',
    body: c.fields.map(([k, label, type]) => `
      <div class="field"><label for="cx-${k}">${label}</label>
        ${type === 'input' ? `<input id="cx-${k}" type="text" maxlength="80" />` : `<textarea id="cx-${k}" maxlength="240"></textarea>`}
      </div>`).join(''),
    foot: `<button class="btn btn--primary btn--block" data-sp="post:${key}">Post</button>`
  });
  setTimeout(() => { const f = $('#cx-' + c.fields[0][0]); if (f) f.focus(); }, 240);
}

function openProductComposer() {
  openSheet({
    title: 'List an item',
    sub: 'The price you set here is the price the server charges. It cannot be changed by the buyer.',
    body: `
      <div class="field"><label for="pf-title">What are you selling?</label><input id="pf-title" type="text" maxlength="60" /></div>
      <div class="field"><label for="pf-price">Price in USDT</label><input id="pf-price" type="text" inputmode="decimal" placeholder="250" /></div>
      <div class="field"><label for="pf-desc">Description</label><textarea id="pf-desc" maxlength="300" placeholder="Condition, what's included, anything wrong with it."></textarea></div>
      <div class="field"><label>Condition</label><div class="pick" id="pf-cond">
        ${['New', 'Like new', 'Used', 'For parts'].map((c, i) => `<button type="button" data-pick="${c}" aria-pressed="${i === 1}">${c}</button>`).join('')}</div></div>
      <div class="field"><label>Category</label><div class="pick" id="pf-cat">
        ${['Electronics', 'Home', 'Clothing', 'Services'].map((c, i) => `<button type="button" data-pick="${c}" aria-pressed="${i === 0}">${c}</button>`).join('')}</div></div>
      <div class="field"><label>Handover</label><div class="pick" id="pf-hand">
        ${['Pickup', 'Delivery', 'Either'].map((c, i) => `<button type="button" data-pick="${c}" aria-pressed="${i === 2}">${c}</button>`).join('')}</div></div>
      <div class="ephemeral-note">${icon('sp-camera')}<span>Photos need storage that is not connected yet, so listings show a generated cover for now.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" data-sp="product-submit">List it</button>`
  });
}

function openDisputeSheet(orderId) {
  openSheet({
    title: 'Report a problem',
    sub: 'This freezes the funds where they are. It does not refund you automatically.',
    body: `
      <div class="field"><label>What went wrong?</label>
        <div class="pick" id="dp-reason">
          ${['Not delivered', 'Not as described', 'Damaged', 'Wrong item', 'Other'].map((r, i) => `
            <button type="button" data-pick="${r}" aria-pressed="${i === 0}">${r}</button>`).join('')}
        </div></div>
      <div class="field"><label for="dp-detail">What happened?</label>
        <textarea id="dp-detail" maxlength="400" placeholder="Be specific. Dates, condition, what you expected."></textarea></div>
      <div class="ephemeral-note">${icon('sp-scale')}<span>Both sides get 96 hours to submit evidence. A moderator reviews the order timeline, delivery record and both submissions before deciding. Filing a dispute you cannot support counts against your account.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" data-sp="dispute-submit:${orderId}">Open dispute</button>`
  });
}

function openEvidenceSheet(disputeId) {
  openSheet({
    title: 'Add evidence',
    sub: 'Anything that shows the state of the item or the handover.',
    body: `
      <div class="field"><label>Type</label><div class="pick" id="ev-kind">
        ${[['photo', 'Photo'], ['doc', 'Document'], ['doc', 'Tracking'], ['doc', 'Messages']].map(([k, t], i) => `
          <button type="button" data-pick="${k}" data-label="${t}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div></div>
      <div class="field"><label for="ev-label">Describe it</label><input id="ev-label" type="text" maxlength="70" placeholder="Photo of the screen taken at handover" /></div>
      <div class="ephemeral-note">${icon('lock')}<span>Evidence is timestamped when it arrives at the server and cannot be edited afterwards. File upload needs storage that is not connected yet, so this records the description only.</span></div>`,
    foot: `<button class="btn btn--primary btn--block" data-sp="evidence-submit:${disputeId}">Submit</button>`
  });
}

function openSpaceSettings(spaceId) {
  const s = spaceById(spaceId);
  const role = Server.roleOf(spaceId);
  openSheet({
    title: 'Space settings',
    sub: `${s.name} · you are ${role}`,
    body: `
      <button class="opt" data-sp="invite:${s.id}"><span class="ic">${icon('sp-key')}</span>
        <span class="tx"><span class="t" style="display:block">Invitation</span><span class="s" style="display:block">Share, or regenerate and lock everyone else out</span></span>
        <span class="go">${icon('chev')}</span></button>
      <div class="opt" style="pointer-events:none"><span class="ic">${icon('shield')}</span>
        <span class="tx"><span class="t" style="display:block">Privacy</span>
        <span class="s" style="display:block">${{ private: 'Invitation only', approval: 'Invitation, with approval', discoverable: 'Discoverable nearby' }[s.privacy]}</span></span></div>
      <div class="opt" style="pointer-events:none"><span class="ic">${icon('users')}</span>
        <span class="tx"><span class="t" style="display:block">Roles</span>
        <span class="s" style="display:block">${Server.ROLE_SETS[s.nature].join(' · ')}</span></span></div>
      <button class="opt" data-sp="leave:${s.id}"><span class="ic">${icon('x')}</span>
        <span class="tx"><span class="t" style="display:block">Leave Space</span><span class="s" style="display:block">You would need a new code to come back</span></span>
        <span class="go">${icon('chev')}</span></button>`,
    foot: `<button class="btn btn--soft btn--block" data-action="close-sheet">Close</button>`
  });
}

/* ---- shared small views ---- */
function spEmpty(text, cta) {
  return `<div class="sp-empty"><p>${esc(text)}</p>${cta ? `<button class="btn btn--soft btn--sm" data-sp="${cta.a}">${esc(cta.t)}</button>` : ''}</div>`;
}

function membersView(s, note) {
  const ms = Server.db.members.filter(m => m.spaceId === s.id);
  const canRole = Server.can(s.id, 'space.member.role');
  return `<div class="sp-sec"><h3>Members <span>${ms.length}</span></h3>
    <div class="sp-card">
      ${ms.map(m => {
        const p = personOf(m.userId);
        return `<div class="mrow">${avatar(p, 40)}
          <div class="m"><div class="n">${esc(p.short || p.name)}</div>
          <div class="s">Joined ${esc(timeAgo(m.joinedAt))}${m.approved === false ? ' · awaiting approval' : ''}</div></div>
          ${canRole && m.role !== 'owner'
            ? `<button class="role" data-sp="role:${s.id}:${m.userId}">${esc(m.role)}</button>`
            : `<span class="role">${esc(m.role)}</span>`}
        </div>`;
      }).join('')}
    </div>
    <p style="font-size:12px;color:var(--muted);padding:6px 2px;line-height:1.5">${esc(note)}</p>
    <button class="btn btn--soft btn--block" style="margin-top:6px" data-sp="invite:${s.id}">${icon('sp-key')}Invite someone</button>
  </div>`;
}

/* ============================================================
   EVENTS
============================================================ */
document.addEventListener('click', async e => {
  const host = e.target.closest('[data-sp]');
  if (!host) return;
  const [verb, a, b] = host.dataset.sp.split(':');
  const S = () => spaceById(sp.activeId);

  switch (verb) {
    case 'create': openWizard(); break;
    case 'spaces': closeSheet(); openSpaces(); break;
    case 'join': openJoinSheet(); break;
    case 'open': openSpace(a); break;
    case 'wallet': openWallet(); break;
    case 'tab': sp.tab = a; renderSpace(); break;
    case 'invite': closeSheet(); setTimeout(() => openInviteSheet(a), 150); break;
    case 'settings': openSpaceSettings(a); break;

    /* wizard */
    case 'wz-nature': wzSet({ nature: a }); break;
    case 'wz-privacy': wzSet({ privacy: a }); break;
    case 'wz-hue': wzSet({ hue: a === 'null' ? null : +a }); break;
    case 'wz-ttlh': wzSet({ inviteTtlHours: +a }); break;
    case 'wz-maxuses': wzSet({ inviteMaxUses: +a || null }); break;
    case 'wz-toggle': captureWizardInputs(); wzSet({ [a]: !sp.wizard[a] }); break;
    case 'wz-feature': {
      const f = sp.wizard.features;
      f[a] = f[a] === false ? true : false;
      renderWizard();
      break;
    }

    /* invitations */
    case 'copy-code': {
      const code = sp.shownCodes[a];
      if (!code) break;
      try { await navigator.clipboard.writeText(code); toast('Code copied', 'check'); }
      catch (_) { toast('Copy is blocked here — write it down', 'x'); }
      break;
    }
    case 'share-code': {
      const s = spaceById(a), code = sp.shownCodes[a];
      const text = `Join "${s.name}" on Ming. Code: ${code}`;
      if (navigator.share) { try { await navigator.share({ text }); } catch (_) {} }
      else { try { await navigator.clipboard.writeText(text); toast('Invitation copied', 'check'); } catch (_) { toast('Sharing is unavailable here', 'x'); } }
      break;
    }
    case 'rotate-code': {
      openModal({
        title: 'Regenerate the code?',
        lede: 'The current code stops working immediately. Anyone who has it but has not joined will be locked out.',
        actions: [{ t: 'Keep it', cls: 'btn--soft', a: 'close-modal' }, { t: 'Regenerate', cls: 'btn--primary', a: 'noop' }]
      });
      $('#modal').querySelector('[data-action="noop"]').addEventListener('click', async () => {
        const res = await Server.submit('space.invite.rotate', { spaceId: a, ttlHours: 24 });
        closeModal();
        if (!res.ok) { toast(res.error, 'x'); return; }
        sp.shownCodes[a] = res.data.code;
        openInviteSheet(a);
        toast('New code issued — the old one is dead', 'check');
      });
      break;
    }
    case 'join-submit': {
      const v = $('#join-code').value;
      const res = await Server.submit('space.join', { code: v });
      if (!res.ok) { toast(res.error, 'x'); return; }
      closeSheet();
      renderSpaces();
      toast(`Joined ${res.data.space.name}`, 'check');
      setTimeout(() => openSpace(res.data.space.id), 260);
      break;
    }

    /* space content */
    case 'new': a === 'product' ? openProductComposer() : openComposerFor(a); break;
    case 'post': {
      const c = COMPOSERS[a];
      const payload = {};
      c.fields.forEach(([k]) => { payload[k] = ($('#cx-' + k) || {}).value || ''; });
      if (!payload[c.fields[0][0]].trim()) { toast('Say something first', 'x'); return; }
      if (a === 'moment') payload.hue = Math.floor(Math.random() * 360);
      if (a === 'event') { const d = new Date(); payload.day = String(d.getDate()); payload.month = d.toLocaleDateString([], { month: 'short' }); payload.title = payload.title; }
      const res = await Server.submit('space.post', { spaceId: sp.activeId, kind: c.kind, payload });
      if (!res.ok) { toast(res.error, 'x'); return; }
      closeSheet(); refreshSpace(); toast('Posted', 'check');
      break;
    }
    case 'react': await Server.submit('content.mutate', { id: a, op: 'react', key: b }); refreshSpace(); break;
    case 'vote': await Server.submit('content.mutate', { id: a, op: 'vote', index: +b }); refreshSpace(); break;
    case 'task': {
      const res = await Server.submit('content.mutate', { id: a, op: 'toggle' });
      if (!res.ok) { toast(res.error, 'x'); return; }
      renderSpace();
      break;
    }
    case 'listtoggle': await Server.submit('content.mutate', { id: a, op: 'listtoggle', index: +b }); refreshSpace(); break;
    case 'listadd': {
      openModal({
        title: 'Add to the list', lede: null,
        fields: `<div class="field"><label for="li-t">Item</label><input id="li-t" type="text" maxlength="60" /></div>`,
        actions: [{ t: 'Cancel', cls: 'btn--soft', a: 'close-modal' }, { t: 'Add', cls: 'btn--primary', a: 'noop' }]
      });
      $('#modal').querySelector('[data-action="noop"]').addEventListener('click', async () => {
        const t = $('#li-t').value.trim();
        if (!t) return closeModal();
        await Server.submit('content.mutate', { id: a, op: 'listadd', text: t });
        closeModal(); refreshSpace();
      });
      break;
    }
    case 'rsvp': {
      const row = Server.db.content.find(c => c.id === a);
      row.going = !row.going;
      refreshSpace();
      toast(row.going ? 'You are going' : 'Removed', 'check');
      break;
    }
    case 'sticker': {
      host.classList.remove('pop'); void host.offsetWidth; host.classList.add('pop');
      await Server.submit('space.post', { spaceId: sp.activeId, kind: 'sticker', payload: { emoji: STICKERS[+a] } });
      setTimeout(refreshSpace, 300);
      break;
    }
    case 'member': toast(`${nameOf(a)} — open their Ming profile from Discover`, 'users'); break;
    case 'apply': toast('Interest registered with the space owner', 'check'); break;
    case 'ask-seller': toast('Request sent to the moderators', 'check'); break;
    case 'loc': requestLocation(() => refreshSpace()); break;
    case 'leave': toast('Leaving a Space needs owner transfer first', 'x'); closeSheet(); break;

    case 'role': {
      const s = spaceById(a);
      const m = Server.db.members.find(x => x.spaceId === a && x.userId === b);
      const roles = Server.ROLE_SETS[s.nature].filter(r => r !== 'owner');
      openSheet({
        title: `Role for ${nameOf(b)}`,
        sub: 'Enforced on the server. Hiding buttons is not a permission system.',
        body: roles.map(r => `<button class="opt" data-sp="setrole:${a}:${b}|${r}">
          <span class="ic">${icon('users')}</span>
          <span class="tx"><span class="t" style="display:block">${r}</span>
          <span class="s" style="display:block">${ROLE_COPY[r] || ''}</span></span>
          ${m.role === r ? icon('check') : `<span class="go">${icon('chev')}</span>`}</button>`).join('')
      });
      break;
    }
    case 'setrole': {
      const [userId, role] = b.split('|');
      const res = await Server.submit('space.member.role', { spaceId: a, userId, role });
      if (!res.ok) { toast(res.error, 'x'); return; }
      closeSheet(); renderSpace(); toast(`${nameOf(userId)} is now ${role}`, 'check');
      break;
    }

    /* marketplace */
    case 'mkcat': sp.marketTab = a; refreshSpace(); break;
    case 'product': openProduct(a); break;
    case 'buy': closeSheet(); setTimeout(() => openCheckout(a), 180); break;
    case 'pay': {
      const idem = 'idem_' + a + '_' + Date.now();
      const created = await Server.submit('order.create', { productId: a, idempotencyKey: idem });
      if (!created.ok) { toast(created.error, 'x'); return; }
      const funded = await Server.submit('order.transition', { orderId: created.data.order.id, transition: 'fund' });
      closeSheet();
      if (!funded.ok) { toast(funded.error, 'x'); renderSpace(); return; }
      toast('Payment held in escrow', 'shield');
      setTimeout(() => openOrder(created.data.order.id), 240);
      break;
    }
    case 'order': openOrder(a); break;
    case 'trans': {
      if (b === 'dispute') { openDisputeSheet(a); break; }
      const res = await Server.submit('order.transition', { orderId: a, transition: b });
      if (!res.ok) { toast(res.error, 'x'); return; }
      renderOrder();
      const st = ORDER_STATES[res.data.order.status];
      toast(st.t, res.data.order.status === 'completed' ? 'check' : 'shield');
      break;
    }
    case 'dispute-submit': {
      const reason = $('#dp-reason').querySelector('[aria-pressed="true"]').dataset.pick;
      const res = await Server.submit('dispute.open', { orderId: a, reason, detail: $('#dp-detail').value.trim() });
      if (!res.ok) { toast(res.error, 'x'); return; }
      closeSheet(); renderOrder();
      toast('Dispute opened — funds stay held', 'shield');
      break;
    }
    case 'evidence': openEvidenceSheet(a); break;
    case 'evidence-submit': {
      const sel = $('#ev-kind').querySelector('[aria-pressed="true"]');
      const label = $('#ev-label').value.trim();
      if (!label) { toast('Describe the evidence', 'x'); return; }
      const res = await Server.submit('dispute.evidence', { disputeId: a, kind: sel.dataset.pick, label });
      if (!res.ok) { toast(res.error, 'x'); return; }
      closeSheet(); renderOrder(); toast('Evidence recorded', 'check');
      break;
    }
    case 'product-submit': {
      const price = parseFloat($('#pf-price').value);
      const res = await Server.submit('product.create', {
        spaceId: sp.activeId,
        title: $('#pf-title').value.trim(),
        price,
        description: $('#pf-desc').value.trim() || 'No description given.',
        condition: $('#pf-cond').querySelector('[aria-pressed="true"]').dataset.pick,
        category: $('#pf-cat').querySelector('[aria-pressed="true"]').dataset.pick,
        handover: $('#pf-hand').querySelector('[aria-pressed="true"]').dataset.pick
      });
      if (!res.ok) { toast(res.error, 'x'); return; }
      closeSheet(); refreshSpace(); toast('Listed', 'check');
      break;
    }
    case 'msg-seller': closeSheet(); setTimeout(() => openChat(a), 180); break;
    case 'wallet-blocked':
      openModal({
        title: a + ' is not available',
        lede: 'Moving real funds needs a custodial provider and the compliance work around it. Ming will not fake a deposit address, a transaction hash or a confirmation. This stays disabled until that integration is real.',
        actions: [{ t: 'Understood', cls: 'btn--primary', a: 'close-modal' }]
      });
      break;
  }
});

const ROLE_COPY = {
  admin: 'Everything except deleting the Space',
  manager: 'Can moderate and assign work',
  moderator: 'Can moderate content and resolve disputes',
  seller: 'Can create listings',
  buyer: 'Can buy and open disputes',
  member: 'Can post and take part',
  guest: 'Read only'
};

/* silly mini-game */
document.addEventListener('pointerdown', e => {
  const btn = e.target.closest('#game-btn');
  if (!btn) return;
  const start = performance.now();
  const clock = $('#game-clock');
  const tick = () => {
    if (!btn.dataset.holding) return;
    clock.textContent = ((performance.now() - start) / 1000).toFixed(2);
    requestAnimationFrame(tick);
  };
  btn.dataset.holding = '1';
  tick();
  const stop = async () => {
    delete btn.dataset.holding;
    window.removeEventListener('pointerup', stop);
    const t = (performance.now() - start) / 1000;
    clock.textContent = t.toFixed(2);
    await Server.submit('space.post', { spaceId: sp.activeId, kind: 'score', payload: { score: t } });
    const off = Math.abs(t - 5);
    toast(off < 0.05 ? 'Suspiciously good.' : off < 0.3 ? 'Respectable.' : 'Terrible. Again.', 'sp-game');
    setTimeout(refreshSpace, 400);
  };
  window.addEventListener('pointerup', stop);
});

/* marketplace search */
document.addEventListener('input', e => {
  if (e.target.id !== 'mk-search') return;
  const q = e.target.value.toLowerCase();
  $$('#mk-grid .mk-prod').forEach(card => {
    const id = card.dataset.sp.split(':')[1];
    const p = Server.db.products.find(x => x.id === id);
    card.style.display = !q || (p.title + p.description + p.category).toLowerCase().includes(q) ? '' : 'none';
  });
});

/* ------------------------------------------------------------
   HOME RAIL — a small entry point on Ming's Home screen
------------------------------------------------------------ */
(function mountHomeRail() {
  const anchor = document.getElementById('home-people');
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.id = 'home-spaces';
  anchor.parentNode.insertBefore(sec, anchor.nextSibling);
})();

function renderHomeSpaces() {
  const host = document.getElementById('home-spaces');
  if (!host) return;
  const list = mySpaces();
  host.innerHTML = sectionHead('Your Spaces', null, { t: 'All', a: 'noop' }).replace('data-action="noop"', 'data-sp="spaces"') +
    `<div class="rail">
      ${list.map(s => `
        <button class="pcard" style="width:150px;padding:0;overflow:hidden" data-sp="open:${s.id}">
          <span style="display:block;height:58px;background:${coverFor(s)}"></span>
          <span style="display:block;padding:11px 12px 13px;text-align:left">
            <span class="name" style="margin:0;display:block">${esc(s.name)}</span>
            <span class="tag" style="display:block">${NATURES[s.nature].label} · ${Server.memberCount(s.id)}</span>
          </span>
        </button>`).join('')}
      <button class="pcard" style="width:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px" data-sp="create">
        <span style="width:38px;height:38px;border-radius:50%;background:var(--surface-2);display:grid;place-items:center;color:var(--coffee)">${icon('plus')}</span>
        <span class="tag" style="white-space:normal">New Space</span>
      </button>
    </div>`;
}

/* ============================================================
   SEED — demo content only. Written through the seeding hook so
   the UI never touches db directly.
============================================================ */
Server._seed(async (db, helpers) => {
  const mk = (space, members) => {
    db.spaces.push(space);
    db.members.push({ spaceId: space.id, userId: currentUser.id, role: members.me, joinedAt: Date.now() - 6 * 864e5, approved: true });
    members.others.forEach(([uid, role, days]) =>
      db.members.push({ spaceId: space.id, userId: uid, role, joinedAt: Date.now() - days * 864e5, approved: true }));
  };
  const base = { privacy: 'private', requireApproval: false, maxMembers: null, locationLinked: false, expiresAt: null, features: {}, ownerId: currentUser.id };

  mk({ ...base, id: 'sp_circle', name: 'The Circle', description: 'Six people who have not shut up since 2019.', nature: 'friendly', hue: null, createdAt: Date.now() - 40 * 864e5 },
    { me: 'owner', others: [['p1', 'moderator', 38], ['p4', 'member', 30], ['p7', 'member', 22], ['p3', 'member', 9]] });

  mk({ ...base, id: 'sp_northline', name: 'Northline Studio', description: 'Client work, in one place.', nature: 'business', hue: 215, createdAt: Date.now() - 120 * 864e5 },
    { me: 'owner', others: [['p2', 'admin', 110], ['p1', 'manager', 90], ['p5', 'member', 40]] });

  mk({ ...base, id: 'sp_market', name: 'The Corner Market', description: 'Buy and sell with people you can actually find.', nature: 'marketplace', hue: 150, locationLinked: true, createdAt: Date.now() - 60 * 864e5 },
    { me: 'buyer', others: [['p7', 'owner', 60], ['p9', 'seller', 50], ['p3', 'seller', 30], ['p2', 'moderator', 55]] });

  const C = (spaceId, kind, authorId, at, payload) =>
    db.content.push({ id: 'c_' + Math.random().toString(36).slice(2, 8), spaceId, kind, authorId, at, ...payload });

  /* friendly */
  C('sp_circle', 'moment', 'p4', Date.now() - 3 * 36e5, { text: 'Won 4–3. Two of those were mine and I will be saying so all week.', hue: 148, reacts: { love: 3, ha: 5 }, mine: {} });
  C('sp_circle', 'moment', 'p7', Date.now() - 9 * 36e5, { text: 'New beans. Come and take some before I drink all of it.', hue: 26, reacts: { love: 4 }, mine: {} });
  C('sp_circle', 'poll', 'p1', Date.now() - 5 * 36e5, { question: 'Saturday: the lake or the market?', options: [{ t: 'Lake, early', votes: 3 }, { t: 'Market, late', votes: 2 }], voted: null });
  C('sp_circle', 'event', 'p1', Date.now() - 20 * 36e5, { title: 'Birthday, the small version', where: "Chidi's place", time: '8pm', day: '19', month: 'Sep', going: false });

  /* business */
  C('sp_northline', 'announcement', 'p2', Date.now() - 26 * 36e5, { title: 'Q4 client review moved to Thursday', body: 'The deck needs the new numbers before Wednesday evening. Ibrahim has the template.', pinned: true });
  C('sp_northline', 'task', currentUser.id, Date.now() - 40 * 36e5, { title: 'Threat model for the payments flow', owner: 'You', due: 'Friday', done: false });
  C('sp_northline', 'task', 'p2', Date.now() - 60 * 36e5, { title: 'Migrate staging to the new region', owner: 'Ibrahim', due: 'Next week', done: false });
  C('sp_northline', 'task', 'p1', Date.now() - 90 * 36e5, { title: 'Brand pass on the onboarding screens', owner: 'Maya', due: 'Done', done: true });
  C('sp_northline', 'opportunity', 'p2', Date.now() - 100 * 36e5, { title: 'Contract front-end, six weeks', body: 'Someone comfortable in vanilla JS and picky about spacing.' });
  C('sp_northline', 'doc', 'p1', Date.now() - 200 * 36e5, { title: 'Brand guidelines v4', meta: 'Maya · updated 3 days ago' });
  C('sp_northline', 'doc', 'p2', Date.now() - 300 * 36e5, { title: 'Incident runbook', meta: 'Ibrahim · updated last month' });

  /* marketplace */
  const P = (sellerId, title, price, condition, category, handover, description, hue, days) =>
    db.products.push({
      id: 'pr_' + Math.random().toString(36).slice(2, 8), spaceId: 'sp_market', sellerId, title, price,
      asset: 'USDT', condition, category, handover, description, qty: 1, hue,
      createdAt: Date.now() - days * 864e5, status: 'listed'
    });
  P('p9', 'Oak side table', 140, 'New', 'Home', 'Pickup', 'Made last month from a single board. Small knot on the underside, otherwise clean. Comes oiled.', 34, 2);
  P('p3', 'Canon AE-1 with 50mm', 250, 'Used', 'Electronics', 'Either', 'Shutter accurate, light seals replaced in June. Two small marks on the body, shown in photos. Includes a strap and one roll of film.', 210, 5);
  P('p7', 'Hand grinder', 48, 'Like new', 'Home', 'Pickup', 'Used for about two months before I upgraded. Burrs are sharp, no wobble.', 22, 1);
  P('p9', 'Bookshelf, two metres', 190, 'New', 'Home', 'Delivery', 'Five shelves, pine, finished in a dark wax. I deliver within the city.', 120, 8);
  P('p3', 'Studio lighting, half day', 60, 'New', 'Services', 'Pickup', 'Two softboxes and a stand, plus me to set them up if you want.', 280, 3);

  /* a completed sale and a live dispute, so the escrow states are visible */
  helpers.ledger(currentUser.id, 'USDT', 'opening', 1240, null, 'Development balance');
  helpers.account(currentUser.id, 'USDT').available = 1240;
  helpers.ledger(currentUser.id, 'BTC', 'opening', 0.0412, null, 'Development balance');
  helpers.account(currentUser.id, 'BTC').available = 0.0412;
  helpers.account('p9', 'USDT').available = 320;
  helpers.account('p3', 'USDT').available = 85;

  await helpers.issueInvite('sp_circle', { ttlHours: 24 });
  await helpers.issueInvite('sp_northline', { ttlHours: 168 });
  await helpers.issueInvite('sp_market', { ttlHours: null, maxUses: 50 });

  db.audit.push(Object.freeze({ id: 'au_seed', spaceId: 'sp_northline', actor: 'p2', event: 'space.created', meta: {}, at: Date.now() - 120 * 864e5 }));
});

renderHomeSpaces();

/* One in-flight order so the lifecycle is not an empty screen. */
(async () => {
  const cam = Server.db.products.find(p => p.title.startsWith('Canon'));
  const res = await Server.submit('order.create', { productId: cam.id, idempotencyKey: 'seed_1' });
  if (res.ok) {
    await Server.submit('order.transition', { orderId: res.data.order.id, transition: 'fund' });
    await Server.submit('order.transition', { orderId: res.data.order.id, transition: 'seller_confirm' });
  }
})();

function seedNewSpace(space) {
  /* A new Space is not empty on arrival: one prompt or starter row that
     matches its nature, written through the same server action a user would. */
  const starters = {
    silly: () => Server.submit('space.post', { spaceId: space.id, kind: 'prompt', payload: { title: 'What is the worst thing you have ever eaten on purpose?' } }),
    romantic: () => Server.submit('space.post', { spaceId: space.id, kind: 'list', payload: { title: 'Places to go', items: [{ t: 'The hill, before seven', done: false }] } }),
    casual: () => Server.submit('space.post', { spaceId: space.id, kind: 'meet', payload: { title: 'Set a meeting point' } })
  };
  if (starters[space.nature]) starters[space.nature]();
}





























/*=============================
   MOON-SKY.JS
=============================*/
/* ============================================================
   ming — Moonflower
   moon-sky.js  ·  a single canvas, one render loop, mounted into
   whichever Moonflower screen is currently active.

   Ming is the world outside; this is the world inside. The engine
   never touches app.js's state or Moonflower's data (goals, notes,
   reminders, chat) — it only draws the environment behind it.

   Two atmospheres share this canvas and one render loop:
     mode 'dark'  — moon, cool stars, a rare occasional eclipse
     mode 'light' — sun, warm atmosphere, faint drifting dust
   The mode follows Ming's existing global theme toggle by watching
   <html data-theme> — the same self-wiring already used below to
   move the canvas between screens. theme.js is never touched.
   ============================================================ */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;

  /* ---- one-time device tier ---- */
  function pickTier() {
    if (REDUCED) return 'still';
    if (cores <= 2 || (COARSE && innerWidth < 380)) return 'low';
    if (cores >= 6 && !COARSE) return 'high';
    return 'mid';
  }
  const TIERS = {
    still: { stars: 90, sat: 0, neb: 1, shoot: 0, dpr: 1, parallax: 0 },
    low: { stars: 70, sat: 2, neb: 1, shoot: 1, dpr: 1, parallax: 0.4 },
    mid: { stars: 150, sat: 3, neb: 2, shoot: 2, dpr: 1.5, parallax: 0.7 },
    high: { stars: 240, sat: 5, neb: 3, shoot: 2, dpr: 2, parallax: 1 }
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* dark atmosphere */
  const NIGHT = {
    space: '#02030A', shadow: '#0B0D16', grey: '#8F929B',
    light: '#DDE2EA', silver: '#BFC5D0', blue: '#11182A', violet: '#28233D'
  };
  /* light atmosphere — evolves from Ming's own warm palette, not a
     plain white flip: quiet cream/gold, sunlight through a still room */
  const DAY = {
    sky: '#F7EEE0', skyEdge: '#EEDFC5', dust: '#E7CFA6',
    sunCore: '#FFF7E6', sunMid: '#F3D9A6', sunEdge: '#D9A75C', cloud: '#EADFC9'
  };

  function initialMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function MoonSky() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'msky';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.tier = pickTier();
    this.cfg = TIERS[this.tier];
    this.mounted = null;
    this.running = false;
    this.w = 0; this.h = 0; this.dpr = 1;
    this.t0 = performance.now();
    this.introStart = null;
    this.slowFrames = 0; this.frameChecks = 0;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.orientReady = false;

    /* mode: 0 = dark/moon, 1 = light/sun. mix eases toward target so a
       theme switch reads as time passing, not a hard cut */
    this.mode = initialMode();
    this.mix = this.mode === 'light' ? 1 : 0;
    this.mixTarget = this.mix;

    /* eclipse: dark-mode only, rare, cinematic. Eligible after a
       while, then again after a long randomized gap. Phases advance
       against accumulated dark-mode viewing time, not wall clock, so
       it never fires while the person is looking at daylight. */
    this.eclipse = { phase: 'idle', t: 0, next: rand(45, 90), darkTime: 0 };
    this.onEclipse = null;

    this._genField();
    this._ro = new ResizeObserver(() => this._resize());
    this._raf = null;

    this._onPointer = e => {
      if (!this.cfg.parallax) return;
      this.pointer.tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      this.pointer.ty = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
    };
    this._onOrient = e => {
      if (!this.cfg.parallax || e.gamma === null) return;
      this.pointer.tx = clamp(e.gamma / 28, -1, 1);
      this.pointer.ty = clamp((e.beta - 40) / 28, -1, 1);
    };
    this._onFirstTap = () => {
      if (this.orientReady) return;
      this.orientReady = true;
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        DeviceOrientationEvent.requestPermission().then(r => {
          if (r === 'granted') window.addEventListener('deviceorientation', this._onOrient);
        }).catch(() => {});
      } else if (typeof DeviceOrientationEvent !== 'undefined') {
        window.addEventListener('deviceorientation', this._onOrient);
      }
    };
  }

  MoonSky.prototype._genField = function () {
    const c = this.cfg;
    this.stars = [];
    for (let i = 0; i < c.stars; i++) {
      const depth = Math.pow(Math.random(), 1.6); // biased toward far (small/dim)
      this.stars.push({
        x: Math.random(), y: Math.random(),
        r: lerp(0.4, 1.9, depth),
        base: lerp(0.15, 0.95, depth),
        depth,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.6, 1.6),
        warm: Math.random() < 0.18
      });
    }
    this.nebula = [];
    for (let i = 0; i < c.neb; i++) {
      this.nebula.push({
        x: rand(0.1, 0.9), y: rand(0.05, 0.7), r: rand(0.28, 0.46),
        hue: Math.random() < 0.5 ? NIGHT.violet : NIGHT.blue,
        alpha: rand(0.12, 0.22), phase: rand(0, Math.PI * 2)
      });
    }
    this.sats = [];
    for (let i = 0; i < c.sat; i++) this._newSat();
    this.shots = [];
    this._nextShot = rand(1800, 4600);
    this.body = { xf: rand(0.68, 0.82), yf: rand(0.2, 0.34), rf: rand(0.24, 0.29), craters: null };
    const cr = [];
    for (let i = 0; i < 15; i++) {
      const a = rand(0, Math.PI * 2), d = rand(0.05, 0.82) * rand(0.4, 1);
      cr.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: rand(0.05, 0.16), shade: rand(0.12, 0.32) });
    }
    this.body.craters = cr;
    this.rays = [];
    for (let i = 0; i < 6; i++) this.rays.push({ a: rand(0, Math.PI * 2), w: rand(0.16, 0.3), speed: rand(0.004, 0.01) });
  };

  MoonSky.prototype._newSat = function () {
    const edge = Math.floor(rand(0, 4));
    const pos = { x: 0, y: 0 };
    if (edge === 0) { pos.x = rand(0, 1); pos.y = -0.05; }
    else if (edge === 1) { pos.x = 1.05; pos.y = rand(0, 1); }
    else if (edge === 2) { pos.x = rand(0, 1); pos.y = 1.05; }
    else { pos.x = -0.05; pos.y = rand(0, 1); }
    const target = { x: rand(0.1, 0.9), y: rand(0.1, 0.9) };
    const speed = rand(0.006, 0.014);
    const ang = Math.atan2(target.y - pos.y, target.x - pos.x);
    this.sats.push({
      x: pos.x, y: pos.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      blink: rand(0, 6), r: rand(1.1, 1.8)
    });
  };

  MoonSky.prototype._spawnShot = function () {
    const c = this.cfg;
    if (this.shots.length >= c.shoot) return;
    const fromTop = Math.random() < 0.7;
    const x = fromTop ? rand(0.1, 0.95) : (Math.random() < 0.5 ? -0.02 : 1.02);
    const y = fromTop ? -0.02 : rand(0.05, 0.5);
    const ang = rand(0.35, 0.85) * (Math.random() < 0.5 ? 1 : -1) + Math.PI / 2 * (fromTop ? 1 : 0.4);
    const speed = rand(0.55, 1.3);
    const big = Math.random() < 0.15;
    this.shots.push({
      x, y, vx: Math.cos(ang) * speed * (fromTop ? 1 : (x < 0 ? 1 : -1)),
      vy: Math.sin(ang) * speed * 0.7 + 0.25,
      life: 0, max: rand(0.7, big ? 1.6 : 1.1), len: big ? rand(120, 190) : rand(55, 110),
      w: big ? rand(1.6, 2.2) : rand(0.8, 1.4)
    });
  };

  /* ---- theme: called by the <html data-theme> watcher below ---- */
  MoonSky.prototype.setMode = function (mode) {
    if (mode !== 'light' && mode !== 'dark') return;
    if (this.mode === mode) return;
    this.mode = mode;
    this.mixTarget = mode === 'light' ? 1 : 0;
    // leaving the dark atmosphere mid-eclipse: let it recede quickly
    // rather than freezing an occluder over a moon that is fading out
    if (mode === 'light' && this.eclipse.phase !== 'idle' && this.eclipse.phase !== 'recede') {
      this.eclipse.phase = 'recede'; this.eclipse.t = 0;
    }
    // the "still" tier never runs a render loop, so give it an
    // immediate, un-animated redraw rather than a stale atmosphere
    if (this.tier === 'still') {
      this.mix = this.mixTarget;
      if (this.mounted) this._draw(performance.now());
    }
  };

  /* ---- lifecycle ---- */
  MoonSky.prototype.mountTo = function (el) {
    if (this.mounted === el) { this.start(); return; }
    if (this.mounted) this._ro.unobserve(this.mounted);
    this.mounted = el;
    el.insertBefore(this.canvas, el.firstChild);
    el.addEventListener('pointerdown', this._onFirstTap, { once: true, passive: true });
    this._ro.observe(el);
    this._resize();
    this.introStart = performance.now();
    this.start();
  };

  MoonSky.prototype._resize = function () {
    if (!this.mounted) return;
    const r = this.mounted.getBoundingClientRect();
    this.dpr = Math.min(devicePixelRatio || 1, this.cfg.dpr);
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
  };

  MoonSky.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    if (this.cfg.parallax) {
      window.addEventListener('pointermove', this._onPointer, { passive: true });
    }
    document.addEventListener('visibilitychange', this._onVis || (this._onVis = () => {
      if (document.hidden) this.stop(); else if (this.mounted) this.start();
    }));
    this._lastT = performance.now();
    if (this.tier === 'still') { this._draw(performance.now()); this.running = false; return; }
    const step = t => { this._frame(t); if (this.running) this._raf = requestAnimationFrame(step); };
    this._raf = requestAnimationFrame(step);
  };

  MoonSky.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('pointermove', this._onPointer);
  };

  MoonSky.prototype._frame = function (t) {
    const start = performance.now();
    this._draw(t);
    const dt = performance.now() - start;
    if (this.frameChecks < 240) {
      this.frameChecks++;
      if (dt > 20) this.slowFrames++;
      if (this.frameChecks === 240 && this.slowFrames > 140 && this.tier !== 'low' && this.tier !== 'still') {
        this.tier = this.tier === 'high' ? 'mid' : 'low';
        this.cfg = TIERS[this.tier];
        this._genField();
      }
    }
  };

  /* ---- eclipse state machine (dark mode only) ----
     approach → align (peak, corona + dip) → recede → idle, then a
     long randomized wait before it's eligible again. */
  MoonSky.prototype._advanceEclipse = function (dtSec) {
    const e = this.eclipse;
    if (this.mode !== 'dark' || this.mix > 0.05) { e.darkTime = 0; return; }
    e.darkTime += dtSec;

    if (e.phase === 'idle') {
      if (e.darkTime >= e.next) { e.phase = 'approach'; e.t = 0; }
      return;
    }
    e.t += dtSec;
    const DUR = { approach: 6, align: 3.2, recede: 6.5 };
    if (e.phase === 'approach' && e.t >= DUR.approach) { e.phase = 'align'; e.t = 0; if (this.onEclipse) this.onEclipse(); }
    else if (e.phase === 'align' && e.t >= DUR.align) { e.phase = 'recede'; e.t = 0; }
    else if (e.phase === 'recede' && e.t >= DUR.recede) {
      e.phase = 'idle'; e.t = 0; e.darkTime = 0; e.next = rand(150, 320);
    }
  };

  /* 0 = no eclipse influence, 1 = full alignment (peak dimming) */
  MoonSky.prototype._eclipseK = function () {
    const e = this.eclipse;
    if (e.phase === 'idle') return 0;
    const DUR = { approach: 6, align: 3.2, recede: 6.5 };
    if (e.phase === 'approach') return clamp(e.t / DUR.approach, 0, 1);
    if (e.phase === 'align') return 1;
    return clamp(1 - e.t / DUR.recede, 0, 1);
  };

  /* ---- draw ---- */
  MoonSky.prototype._draw = function (t) {
    const ctx = this.ctx, w = this.w, h = this.h, dpr = this.dpr;
    const dtSec = clamp((t - (this._lastT || t)) / 1000, 0, 0.25);
    this._lastT = t;
    this.mix = lerp(this.mix, this.mixTarget, clamp(dtSec * 1.1, 0, 1));
    this._advanceEclipse(dtSec);
    const eK = this._eclipseK();
    this.eclipsing = eK > 0.02 && this.mix < 0.5;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const mix = this.mix; // 0 dark .. 1 light

    /* sky fill — cross-faded, never a hard swap */
    ctx.fillStyle = NIGHT.space;
    ctx.fillRect(0, 0, w, h);
    if (mix > 0.002) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, DAY.sky);
      sky.addColorStop(1, DAY.skyEdge);
      ctx.save();
      ctx.globalAlpha = mix;
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const time = (t - this.t0) / 1000;
    const intro = this.introStart ? clamp((t - this.introStart) / 1400, 0, 1) : 1;
    const introEase = 1 - Math.pow(1 - intro, 3);
    const dim = 1 - eK * 0.4; // eclipse ambient dip

    if (this.cfg.parallax) {
      this.pointer.x = lerp(this.pointer.x, this.pointer.tx, 0.05);
      this.pointer.y = lerp(this.pointer.y, this.pointer.ty, 0.05);
    }
    const px = this.pointer.x, py = this.pointer.y;

    const bodyX = this.body.xf * w;
    const bodyY = this.body.yf * h + (this.tier === 'still' ? 0 : Math.sin(time * 0.06) * 4);
    const bodyR = this.body.rf * Math.min(w, h * 1.15);

    /* nebula / soft cloud — farthest, barely moves, hue crosses over */
    ctx.save();
    ctx.translate(px * 5, py * 5);
    this.nebula.forEach(n => {
      const nx = n.x * w + Math.sin(time * 0.05 + n.phase) * 10;
      const ny = n.y * h + Math.cos(time * 0.04 + n.phase) * 8;
      const r = n.r * Math.max(w, h);
      const nightA = n.alpha * introEase * (1 - mix) * dim;
      if (nightA > 0.003) {
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        g.addColorStop(0, hexA(n.hue, nightA));
        g.addColorStop(1, hexA(n.hue, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(nx, ny, r, 0, 7); ctx.fill();
      }
      const dayA = n.alpha * 0.55 * introEase * mix;
      if (dayA > 0.003) {
        const g2 = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        g2.addColorStop(0, hexA(DAY.cloud, dayA));
        g2.addColorStop(1, hexA(DAY.cloud, 0));
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(nx, ny, r, 0, 7); ctx.fill();
      }
    });
    ctx.restore();

    /* stars ⇄ dust — same positions and twinkle, color/alpha crosses over */
    const still = this.tier === 'still';
    const pulseBoost = (this._pulseUntil && t < this._pulseUntil)
      ? 0.22 * ((this._pulseUntil - t) / 900)
      : 0;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const factor = lerp(3, 20, s.depth) * this.cfg.parallax;
      const sx = s.x * w + px * factor;
      const sy = s.y * h + py * factor;
      let a = s.base;
      if (!still) a *= 0.72 + 0.28 * Math.sin(time * s.speed + s.phase);
      const dm = Math.hypot(sx - bodyX, sy - bodyY);
      const glowBoost = dm < bodyR * 3.2 ? (1 - dm / (bodyR * 3.2)) * 0.35 : 0;
      const nightA = clamp((a + glowBoost + pulseBoost) * dim, 0, 1) * introEase * (1 - mix);
      const dayA = a * 0.22 * mix * introEase; // faint dust, deliberately subtle
      if (nightA > 0.004) {
        ctx.beginPath();
        ctx.fillStyle = s.warm ? `rgba(223,214,196,${nightA})` : `rgba(221,226,234,${nightA})`;
        ctx.arc(sx, sy, s.r, 0, 7);
        ctx.fill();
        if (s.r > 1.5 && nightA > 0.6) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(221,226,234,${nightA * 0.12})`;
          ctx.arc(sx, sy, s.r * 3.2, 0, 7);
          ctx.fill();
        }
      }
      if (dayA > 0.004) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(217,167,92,${dayA})`;
        ctx.arc(sx, sy, s.r * 0.85, 0, 7);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(px * 6 * this.cfg.parallax, py * 6 * this.cfg.parallax);

    /* sun bloom + disc (fades in as mix → 1) */
    if (mix > 0.01) {
      ctx.save();
      ctx.globalAlpha = mix * introEase;
      const sunBloomR = bodyR * 2.9;
      const sbloom = ctx.createRadialGradient(bodyX, bodyY, bodyR * 0.3, bodyX, bodyY, sunBloomR);
      sbloom.addColorStop(0, hexA(DAY.sunEdge, 0.28));
      sbloom.addColorStop(1, hexA(DAY.sunEdge, 0));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sbloom;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, sunBloomR, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      if (!still) {
        this.rays.forEach(ray => {
          const a0 = ray.a + time * ray.speed;
          ctx.save();
          ctx.translate(bodyX, bodyY);
          ctx.rotate(a0);
          const rg = ctx.createRadialGradient(0, 0, bodyR * 0.9, 0, 0, bodyR * 2.4);
          rg.addColorStop(0, hexA(DAY.sunMid, 0.05));
          rg.addColorStop(1, hexA(DAY.sunMid, 0));
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, bodyR * 2.4, -ray.w / 2, ray.w / 2);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        });
      }

      const sun = ctx.createRadialGradient(
        bodyX - bodyR * 0.25, bodyY - bodyR * 0.28, bodyR * 0.1,
        bodyX, bodyY, bodyR * 0.86
      );
      sun.addColorStop(0, DAY.sunCore);
      sun.addColorStop(0.55, DAY.sunMid);
      sun.addColorStop(1, DAY.sunEdge);
      ctx.fillStyle = sun;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR * 0.86, 0, 7); ctx.fill();
      ctx.restore();
    }

    /* moon bloom + disc + craters (fades in as mix → 0) */
    if (mix < 0.99) {
      const moonAlpha = (1 - mix) * introEase * dim;
      const bloomR = bodyR * 2.6;
      const bloom = ctx.createRadialGradient(bodyX - bodyR * 0.3, bodyY - bodyR * 0.3, bodyR * 0.4, bodyX, bodyY, bloomR);
      bloom.addColorStop(0, `rgba(224,227,238,${0.30 * moonAlpha})`);
      bloom.addColorStop(1, 'rgba(224,227,238,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = bloom;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, bloomR, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = moonAlpha;
      const disc = ctx.createRadialGradient(
        bodyX - bodyR * 0.38, bodyY - bodyR * 0.4, bodyR * 0.15,
        bodyX, bodyY, bodyR
      );
      disc.addColorStop(0, '#F1F0EE');
      disc.addColorStop(0.42, NIGHT.light);
      disc.addColorStop(0.75, NIGHT.silver);
      disc.addColorStop(1, NIGHT.shadow);
      ctx.fillStyle = disc;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR, 0, 7); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR, 0, 7); ctx.clip();
      this.body.craters.forEach(cr => {
        const cx = bodyX + cr.dx * bodyR, cy = bodyY + cr.dy * bodyR, r = cr.r * bodyR;
        const lit = ((cx - bodyX) < 0) ? 1 : 0.4;
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        g.addColorStop(0, `rgba(11,13,22,0)`);
        g.addColorStop(0.6, `rgba(11,13,22,${cr.shade * 0.5 * lit})`);
        g.addColorStop(1, `rgba(11,13,22,${cr.shade * lit})`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      });
      const rim = ctx.createRadialGradient(bodyX - bodyR * 0.5, bodyY - bodyR * 0.5, bodyR * 0.7, bodyX - bodyR * 0.5, bodyY - bodyR * 0.5, bodyR * 1.05);
      rim.addColorStop(0, 'rgba(255,255,255,0)');
      rim.addColorStop(1, 'rgba(255,255,255,.18)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR, 0, 7); ctx.fill();
      ctx.restore();
      ctx.restore();

      /* eclipse occluder + corona, drawn only while it's actually happening */
      if (eK > 0.02) {
        const approach = this.eclipse.phase === 'recede' ? 1 - eK : eK;
        const ox = bodyX + (1 - approach) * bodyR * 2.4;
        const oy = bodyY - (1 - approach) * bodyR * 0.6;
        ctx.save();
        ctx.globalAlpha = moonAlpha;
        ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR, 0, 7); ctx.clip();
        ctx.fillStyle = NIGHT.space;
        ctx.beginPath(); ctx.arc(ox, oy, bodyR * 1.02, 0, 7); ctx.fill();
        ctx.restore();
        if (this.eclipse.phase === 'align') {
          const corona = ctx.createRadialGradient(bodyX, bodyY, bodyR * 0.94, bodyX, bodyY, bodyR * 1.16);
          corona.addColorStop(0, 'rgba(255,255,255,0)');
          corona.addColorStop(0.7, `rgba(255,246,232,${0.5 * moonAlpha})`);
          corona.addColorStop(1, 'rgba(255,246,232,0)');
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = corona;
          ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR * 1.16, 0, 7); ctx.fill();
          ctx.restore();
        }
      }
    }
    ctx.restore();

    /* satellites — a night-sky detail, fades out with the moon */
    if (!still && mix < 0.9) {
      const dt = 1 / 60;
      const satA = (1 - mix) * dim;
      this.sats.forEach((s, idx) => {
        s.x += s.vx; s.y += s.vy; s.blink += dt;
        if (s.x < -0.1 || s.x > 1.1 || s.y < -0.1 || s.y > 1.1) { this.sats.splice(idx, 1); this._newSat(); return; }
        const sx = s.x * w + px * 10 * this.cfg.parallax, sy = s.y * h + py * 10 * this.cfg.parallax;
        const blink = 0.4 + 0.6 * Math.max(0, Math.sin(s.blink * 1.3));
        const tlen = 9, ang = Math.atan2(s.vy, s.vx);
        const g = ctx.createLinearGradient(sx, sy, sx - Math.cos(ang) * tlen, sy - Math.sin(ang) * tlen);
        g.addColorStop(0, `rgba(200,208,224,${0.5 * introEase * satA})`);
        g.addColorStop(1, 'rgba(200,208,224,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(ang) * tlen, sy - Math.sin(ang) * tlen); ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = `rgba(216,222,232,${blink * introEase * satA})`;
        ctx.arc(sx, sy, s.r, 0, 7); ctx.fill();
      });
    }

    /* shooting stars — same, night-only */
    if (!still && mix < 0.9) {
      this._nextShot -= 16.7;
      if (this._nextShot <= 0) { this._spawnShot(); this._nextShot = rand(2200, 8600); }
      const shotA = (1 - mix) * dim;
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const sh = this.shots[i];
        sh.life += 1 / 60;
        sh.x += sh.vx * 0.012; sh.y += sh.vy * 0.012;
        sh.vx *= 1.012; sh.vy *= 1.012;
        const alpha = (sh.life < sh.max * 0.15
          ? sh.life / (sh.max * 0.15)
          : clamp(1 - (sh.life - sh.max * 0.15) / (sh.max * 0.85), 0, 1)) * shotA;
        if (sh.life >= sh.max || alpha <= 0) { this.shots.splice(i, 1); continue; }
        const hx = sh.x * w, hy = sh.y * h;
        const ang = Math.atan2(sh.vy, sh.vx);
        const tx = hx - Math.cos(ang) * sh.len, ty = hy - Math.sin(ang) * sh.len;
        const g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(0.4, `rgba(221,226,234,${alpha * 0.5})`);
        g.addColorStop(1, 'rgba(221,226,234,0)');
        ctx.strokeStyle = g; ctx.lineWidth = sh.w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      }
    }

    ctx.restore();
  };

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ---- react to Moonflower-specific moments ---- */
  MoonSky.prototype.pulse = function () {
    // a brief brightening, used when a message lands inside "Talk to Me"
    if (this.tier === 'still') return;
    const boost = 900;
    this._pulseUntil = performance.now() + boost;
  };

  /* ============================================================
     auto-wiring — no changes to app.js or theme.js required.
     One observer moves the canvas between Moonflower's two screens;
     a second watches the global theme and crossfades this engine's
     own atmosphere to match, independently of anything else that
     also reacts to that same attribute.
  ============================================================ */
  const sky = new MoonSky();
  window.MoonSky = sky;

  const ids = ['screen-moonflower', 'screen-moonroom'];
  const screens = ids.map(id => document.getElementById(id)).filter(Boolean);

  function sync() {
    const active = screens.find(s => s.classList.contains('is-active'));
    if (active) sky.mountTo(active);
    else sky.stop();
  }
  screens.forEach(s => new MutationObserver(sync).observe(s, { attributes: true, attributeFilter: ['class'] }));
  sync();

  new MutationObserver(() => sky.setMode(initialMode()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();




















/*=================================
   THEME.JS
=================================*/
/* ============================================================
   ming — theme toggle
   theme.js  ·  sun ⇄ moon, one control, reused everywhere it appears

   Priority for the resolved theme:
     explicit Ming choice (localStorage) → system preference → light
   The inline snippet in <head> already applied the initial value to
   <html data-theme="..."> before paint; this file only wires the
   button(s) and orchestrates the transition from here on.
   ============================================================ */
(function () {
  const KEY = 'ming-theme';
  const EXPLICIT_KEY = 'ming-theme-explicit';
  const root = document.documentElement;
  const sweep = document.getElementById('theme-sweep');
  const toggles = () => Array.from(document.querySelectorAll('[data-theme-toggle]'));
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncButtons() {
    const dark = current() === 'dark';
    toggles().forEach(btn => {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#100D0B' : '#F7F2EC');
  }

  function persist(theme) {
    try {
      localStorage.setItem(KEY, theme);
      localStorage.setItem(EXPLICIT_KEY, '1');
    } catch (e) {}
  }

  /* Sun → dusk → moon, or moon → dawn → sun. The sweep visually
     covers the moment the CSS variables actually flip, which is what
     makes an instant variable swap read as something continuous. */
  function transition(fromBtn) {
    const next = current() === 'dark' ? 'light' : 'dark';
    const rm = reduceMotion();
    const app = document.getElementById('app');

    if (fromBtn && app) {
      const r = fromBtn.getBoundingClientRect();
      const a = app.getBoundingClientRect();
      sweep.style.setProperty('--sweep-x', (r.left + r.width / 2 - a.left) + 'px');
      sweep.style.setProperty('--sweep-y', (r.top + r.height / 2 - a.top) + 'px');
    }

    sweep.classList.remove('to-dark', 'to-light', 'is-sweeping');
    toggles().forEach(b => b.classList.remove('is-pulsing'));

    if (!rm) {
      root.classList.add('theme-transitioning');
      sweep.classList.add(next === 'dark' ? 'to-dark' : 'to-light');
      // restart the animation even if one just ran
      void sweep.offsetWidth;
      sweep.classList.add('is-sweeping');
      toggles().forEach(b => { void b.offsetWidth; b.classList.add('is-pulsing'); });
    }

    // flip the variables while the sweep is at its most opaque, so the
    // swap itself is hidden rather than felt as a snap
    const flipDelay = rm ? 0 : 320;
    setTimeout(() => {
      root.setAttribute('data-theme', next);
      persist(next);
      syncButtons();
    }, flipDelay);

    const cleanupDelay = rm ? 60 : 900;
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
      sweep.classList.remove('is-sweeping', 'to-dark', 'to-light');
      toggles().forEach(b => b.classList.remove('is-pulsing'));
    }, cleanupDelay);
  }

  toggles().forEach(btn => {
    btn.addEventListener('click', () => transition(btn));
  });

  // Live-follow the system only until the person makes an explicit choice.
  try {
    if (!localStorage.getItem(EXPLICIT_KEY)) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem(EXPLICIT_KEY)) return;
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        syncButtons();
      });
    }
  } catch (e) {}

  syncButtons();
})();






}

/* ------------------------------------------------------------
   MING AUTH — STRICT FORM VALIDATION + SUPABASE AUTH
------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');

  /* ----------------------------------------------------------
     SECURITY HELPERS
  ---------------------------------------------------------- */

  const MAX_NAME_LENGTH = 60;
  const MAX_USERNAME_LENGTH = 30;
  const MAX_EMAIL_LENGTH = 254;
  const MIN_PASSWORD_LENGTH = 12;
  const MAX_PASSWORD_LENGTH = 128;

  /*
     Reject Unicode control characters, null bytes,
     zero-width characters and other invisible characters
     that should never be present in profile fields.
  */
  function containsUnsafeCharacters(value) {
    return /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/u.test(value);
  }

  /*
     Normalize user-controlled text without modifying passwords.
  */
  function normalizeText(value) {
    return value.normalize('NFKC').trim();
  }

  /*
     Username policy:
     - 3–30 characters
     - ASCII letters
     - numbers
     - underscore
     - hyphen
     - must begin/end with letter or number
  */
  function isValidUsername(username) {
    return /^[A-Za-z0-9](?:[A-Za-z0-9_-]{1,28}[A-Za-z0-9])?$/.test(
      username
    );
  }

  /*
     Reasonable email validation.
     Supabase remains the authoritative authentication layer.
  */
  function isValidEmail(email) {
    if (!email || email.length > MAX_EMAIL_LENGTH) {
      return false;
    }

    if (containsUnsafeCharacters(email)) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidDisplayName(name) {
    if (!name || name.length > MAX_NAME_LENGTH) {
      return false;
    }

    if (containsUnsafeCharacters(name)) {
      return false;
    }

    return true;
  }

  function isValidPassword(password) {
    /*
       Do NOT normalize, trim, lowercase, or otherwise modify
       passwords. Passwords must reach Supabase exactly as entered.
    */
    return (
      password.length >= MIN_PASSWORD_LENGTH &&
      password.length <= MAX_PASSWORD_LENGTH &&
      !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(password)
    );
  }

  function setMessage(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function setButtonState(form, disabled) {
    const button = form?.querySelector('button[type="submit"]');

    if (!button) return;

    button.disabled = disabled;
    button.setAttribute('aria-busy', disabled ? 'true' : 'false');
  }

  /* ----------------------------------------------------------
     LOGIN ↔ SIGNUP SWITCHING
  ---------------------------------------------------------- */

  if (showSignup && loginForm && signupForm) {
    showSignup.addEventListener('click', (event) => {
      event.preventDefault();

      loginForm.hidden = true;
      signupForm.hidden = false;

      setMessage(
        document.getElementById('login-message'),
        ''
      );
    });
  }

  if (showLogin && loginForm && signupForm) {
    showLogin.addEventListener('click', (event) => {
      event.preventDefault();

      signupForm.hidden = true;
      loginForm.hidden = false;

      setMessage(
        document.getElementById('signup-message'),
        ''
      );
    });
  }

  /* ----------------------------------------------------------
     SIGN UP
  ---------------------------------------------------------- */

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const message = document.getElementById('signup-message');

      /*
         Prevent double submissions while Supabase is processing
         the request.
      */
      if (signupForm.dataset.submitting === 'true') {
        return;
      }

      signupForm.dataset.submitting = 'true';
      setButtonState(signupForm, true);

      try {
        const nameInput = document.getElementById('signup-name');
        const usernameInput = document.getElementById('signup-username');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');

        if (
          !nameInput ||
          !usernameInput ||
          !emailInput ||
          !passwordInput
        ) {
          setMessage(
            message,
            'The signup form is temporarily unavailable.'
          );
          return;
        }

        const name = normalizeText(nameInput.value);
        const username = normalizeText(usernameInput.value);
        const email = normalizeText(emailInput.value);
        const password = passwordInput.value;

        /* ------------------------------------------------------
           STRICT VALIDATION
        ------------------------------------------------------ */

        if (!isValidDisplayName(name)) {
          setMessage(
            message,
            'Please enter a valid display name using 1–60 characters.'
          );
          return;
        }

        if (!isValidUsername(username)) {
          setMessage(
            message,
            'Username must be 3–30 characters and contain only letters, numbers, underscores, or hyphens.'
          );
          return;
        }

        if (!isValidEmail(email)) {
          setMessage(
            message,
            'Please enter a valid email address.'
          );
          return;
        }

        if (!isValidPassword(password)) {
          setMessage(
            message,
            'Password must be 12–128 characters long.'
          );
          return;
        }

        /*
           Keep username canonical.
           This prevents visually confusing variants such as
           "Connell", "CONNELL", and "connell".
        */
        const canonicalUsername = username.toLowerCase();

        /* ------------------------------------------------------
           SUPABASE AUTH
           Supabase handles the actual authentication request.
           No SQL is constructed from these values.
        ------------------------------------------------------ */

        const { data, error } =
          await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: name,
                username: canonicalUsername
              }
            }
          });

        if (error) {
          /*
             Do not expose raw backend errors unnecessarily.
             Do not log passwords, tokens, or authentication data.
          */
          console.error('Ming signup failed:', error.message);

          setMessage(
            message,
            'We could not create your account. Please check your details and try again.'
          );

          return;
        }

        /*
           Do not log `data`.
           It can contain authentication-related information.
        */

        if (data?.user && !data?.session) {
          setMessage(
            message,
            'Account created. Check your email to confirm your account.'
          );
        } else {
          setMessage(
            message,
            'Account created successfully.'
          );
        }

      } catch (error) {
        console.error(
          'Ming signup request failed.'
        );

        setMessage(
          message,
          'Something went wrong. Please try again.'
        );

      } finally {
        signupForm.dataset.submitting = 'false';
        setButtonState(signupForm, false);
      }
    });
  }

  /* ----------------------------------------------------------
     LOG IN
  ---------------------------------------------------------- */

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const message = document.getElementById('login-message');

      if (loginForm.dataset.submitting === 'true') {
        return;
      }

      loginForm.dataset.submitting = 'true';
      setButtonState(loginForm, true);

      try {
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');

        if (!emailInput || !passwordInput) {
          setMessage(
            message,
            'The login form is temporarily unavailable.'
          );
          return;
        }

        const email = normalizeText(emailInput.value);
        const password = passwordInput.value;

        /* ------------------------------------------------------
           LOGIN VALIDATION
        ------------------------------------------------------ */

        if (!isValidEmail(email)) {
          setMessage(
            message,
            'Please enter a valid email address.'
          );
          return;
        }

        if (
          password.length < 1 ||
          password.length > MAX_PASSWORD_LENGTH
        ) {
          setMessage(
            message,
            'Email or password is incorrect.'
          );
          return;
        }

        /* ------------------------------------------------------
           SUPABASE LOGIN
        ------------------------------------------------------ */
        
const { error } =
  await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

if (error) {
  /*
     Generic authentication error helps avoid unnecessarily
     revealing whether a particular account exists.
  */
  console.error('Ming login failed:', error.message);

  setMessage(
    message,
    'Email or password is incorrect.'
  );

  return;
}

setMessage(
  message,
  'Signed in successfully.'
);


/* ------------------------------------------------------
   OPEN MING AFTER SUCCESSFUL LOGIN
------------------------------------------------------ */

window.location.href = 'app.html';


} catch (error) {
  console.error(
    'Ming login request failed.'
  );

  setMessage(
    message,
    'Something went wrong. Please try again.'
  );

} finally {
  loginForm.dataset.submitting = 'false';
  setButtonState(loginForm, false);
}
});
}
});


/* ------------------------------------------------------------
   MING AUTH SESSION
------------------------------------------------------------ */

(async function initMingAuthSession() {

  const isAppPage =
    window.location.pathname.endsWith('app.html');

  if (!isAppPage) {
    return;
  }

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error || !session?.user) {
    console.log('Ming: no authenticated session. Returning to login.');

    window.location.href = 'index.html';

    return;
  }

  console.log('Ming: authenticated session detected.');

})();
