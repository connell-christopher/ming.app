/* Tweaklr SILLY — additive Chaos Space experience.
 * Uses the existing Space content RPC and never displays author/profile data.
 * Real server-side anonymity, AI moderation, server-enforced expiry and audio
 * upload require backend services; this module does not pretend client-side
 * UI can enforce those guarantees.
 */
(function () {
  'use strict';
  if (window.__tweaklrSillyInstalled) return;
  window.__tweaklrSillyInstalled = true;

  const MODES = [
    ['chaos', 'CHAOS', 'Unfiltered nonsense'],
    ['whisper', 'WHISPER', '3am brain only'],
    ['roast', 'ROAST', 'Laugh with, not at']
  ];
  const ALIASES_A = ['Expired','Confused','Suspicious','Unlicensed','Sleepy','Cosmic','Discount','Haunted','Tiny','Tax-Evading','Emotional-Support','Overcaffeinated','Unsupervised','Wobbly','Legendary'];
  const ALIASES_B = ['Milk','Pigeon','Toaster','Potato','Squirrel','Sock','Goose','Llama','Microwave','Pickle','Mushroom','Teaspoon','Hamster','Crouton','Traffic Cone','Ceiling Fan'];
  const DARES = [
    'Confess your undying love to the nearest inanimate object. Keep it dramatic.',
    'Write a breakup letter to your alarm clock. It knows what it did.',
    'Describe your day like a wildlife documentary narrated by a confused penguin.',
    'Give your last meal a villain origin story.',
    'Write a 7-word apology to your future self for absolutely no reason.',
    'Invent a national anthem for people who open the fridge and forget why.',
    'Post a fake breaking-news headline about your sock situation.',
    'Give your brain a performance review. HR is a potato.',
    'Describe your mood as a suspicious object found at an airport.',
    'Write a love poem to a library chair. Make it sound like a season finale.',
    'Create a new Olympic sport that can only be played while sleepy.',
    'Explain why you should be crowned Minister of Doing Absolutely Nothing.',
    'Give your last brain cell a name, job title and two references.',
    'Write a royal decree banning one mildly annoying household sound.',
    'Turn your most boring daily task into a blockbuster movie trailer.'
  ];
  const REWRITES = [
    [/\bI failed my exam\b/ig, 'My brain went on an unscheduled holiday and left me to face the exam boss alone 😭'],
    [/\bI am tired\b/ig, 'My battery is at 2% and the charger has entered witness protection 🫠'],
    [/\bI am sad\b/ig, 'My internal clown has misplaced the confetti today 🥲'],
    [/\bI am angry\b/ig, 'My patience has left the group chat without saying goodbye 😤'],
    [/\bI am hungry\b/ig, 'My stomach is currently hosting a live protest with drums 🍜'],
    [/\bI am bored\b/ig, 'My brain is buffering on a blank screen with elevator music 🦥'],
    [/\bI love you\b/ig, 'You are my favourite little plot twist and I am being so normal about it 🫶'],
    [/\bI have no money\b/ig, 'My wallet is an interactive museum exhibit titled “The Great Emptiness” 💸'],
    [/\bI overslept\b/ig, 'I negotiated with the pillow and the pillow won by unanimous decision 🛌'],
    [/\bI made a mistake\b/ig, 'My hands released a surprise plot twist without consulting management 🫡']
  ];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const currentSpace = () => typeof spaceById === 'function' ? spaceById(sp.activeId) : null;
  const isSillyOpen = () => !!(document.querySelector('#screen-space[data-nature="silly"]') && currentSpace()?.nature === 'silly');
  const contents = (spaceId, kind) => Server.db.content.filter(row => row.spaceId === spaceId && row.kind === kind);
  const ukHour = () => Number(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  const midnight = () => ukHour() >= 23 || ukHour() < 4;
  const aliasFor = spaceId => {
    const used = new Set(contents(spaceId,'silly_post').map(row => row.alias).filter(Boolean));
    for (let i=0;i<80;i++) {
      const a = ALIASES_A[Math.floor(Math.random()*ALIASES_A.length)];
      const b = ALIASES_B[Math.floor(Math.random()*ALIASES_B.length)];
      const alias = a + ' ' + b + ' #' + (10 + Math.floor(Math.random()*990));
      if (!used.has(alias)) return alias;
    }
    return 'Mystery Crouton #' + Date.now().toString(36);
  };
  const timeLabel = value => {
    const ms = Date.now() - Number(value || Date.now());
    if (ms < 60000) return 'just now';
    if (ms < 3600000) return Math.floor(ms/60000) + 'm ago';
    return Math.floor(ms/3600000) + 'h ago';
  };
  function rewrite(text) {
    let result = String(text || '').trim();
    REWRITES.forEach(([pattern,replacement]) => { result = result.replace(pattern,replacement); });
    if (result && result === String(text || '').trim()) result = 'Breaking news from my brain: ' + result + ' (source: one very confused pigeon 🐦)';
    return result;
  }
  function toast(message) {
    const n = document.getElementById('silly-toast');
    if (n) { n.textContent = message; n.hidden = false; clearTimeout(n._timer); n._timer = setTimeout(()=>n.hidden=true,2600); }
  }
  function boop() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx(), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(560,ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(240,ctx.currentTime+.075);
      gain.gain.setValueAtTime(.045,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.095);
      osc.onended=()=>ctx.close();
    } catch (_) {}
  }
  function scatter(origin) {
    const screen = document.querySelector('#screen-space');
    if (!screen || !origin) return;
    const rect = origin.getBoundingClientRect();
    for (let i=0;i<7;i++) {
      const dot=document.createElement('i'); dot.className='silly-burst';
      dot.style.left=(rect.left+rect.width/2)+'px'; dot.style.top=(rect.top+rect.height/2)+'px';
      dot.style.setProperty('--dx',(Math.random()*110-55)+'px'); dot.style.setProperty('--dy',(Math.random()*-95-10)+'px');
      screen.appendChild(dot); setTimeout(()=>dot.remove(),720);
    }
  }
  function isExpired(post, spaceId) {
    const lolCount = reactions(spaceId, post.id).filter(r => r.reaction === 'lol').length;
    if (lolCount >= 20 || Number(post.lols || 0) >= 20 || post.legendary) return false;
    return Date.now() - Number(post.at || post.createdAt || Date.now()) >= 86400000;
  }
  function visiblePosts(spaceId, mode) {
    return contents(spaceId,'silly_post')
      .filter(post => !isExpired(post, spaceId) && (mode === 'chaos' || post.mode === mode))
      .sort((a,b) => {
        if (mode === 'roast') return Number(b.lols||0)-Number(a.lols||0) || Number(b.at||0)-Number(a.at||0);
        return Number(b.at||0)-Number(a.at||0);
      });
  }
  function reactions(spaceId, postId) {
    return contents(spaceId,'silly_reaction').filter(r => r.postId === postId);
  }
  function replies(spaceId, postId) {
    return contents(spaceId,'silly_reply').filter(r => r.postId === postId).sort((a,b)=>Number(a.at||0)-Number(b.at||0));
  }
  function card(post, spaceId, index) {
    const rs = reactions(spaceId,post.id);
    const lol = rs.filter(r=>r.reaction==='lol').length;
    const wild = rs.filter(r=>r.reaction==='wild').length;
    const thread = replies(spaceId,post.id);
    const angle = [-1.1,.7,-.45,1.15,-.8][index%5];
    const legendary = lol >= 20 || post.legendary;
    return '<article class="silly-post'+(legendary?' is-legendary':'')+'" style="--tilt:'+angle+'deg" data-silly-post="'+esc(post.id)+'">'+
      '<div class="silly-post__top"><span class="silly-alias"><i></i>'+esc(post.alias||'Mystery Potato')+'</span><span class="silly-post__time">'+(legendary?'🏆 LEGENDARY':timeLabel(post.at))+'</span></div>'+
      (post.mode==='whisper'?'<span class="silly-mode-tag">🥃 3AM WHISPER</span>':post.mode==='roast'?'<span class="silly-mode-tag">🔥 ROAST PIT</span>':'')+
      '<p class="silly-post__text">'+esc(post.text||'')+'</p>'+
      (post.mediaUrl?'<a class="silly-media-link" href="'+esc(post.mediaUrl)+'" target="_blank" rel="noopener">Open attached media ↗</a>':'')+
      '<div class="silly-post__actions"><button type="button" data-silly-react="lol" data-post-id="'+esc(post.id)+'" aria-label="LOL reaction">😂 <b>LOL</b><span>'+lol+'</span></button><button type="button" data-silly-react="wild" data-post-id="'+esc(post.id)+'">🫨 <b>YOU WILD</b><span>'+wild+'</span></button><button type="button" data-silly-reply="'+esc(post.id)+'">💬 Bubble reply <span>'+thread.length+'</span></button></div>'+
      (legendary?'<div class="silly-legend-note">HALL OF SHAME · immortal nonsense</div>':'')+
      '<div class="silly-reply-composer" data-reply-box="'+esc(post.id)+'" hidden><textarea maxlength="220" rows="2" placeholder="Drop a tiny bubble into the chaos…"></textarea><button type="button" data-silly-send-reply="'+esc(post.id)+'">Float it ↗</button></div>'+
      (thread.length?'<div class="silly-bubble-tank" aria-label="Anonymous reply bubbles">'+thread.slice(-12).map((r,i)=>'<span class="silly-bubble" style="--bubble-delay:'+(i%6)*-.4+'s">'+esc(r.text)+'</span>').join('')+'</div>':'')+
      '</article>';
  }
  function render(spaceId) {
    if (!isSillyOpen() || sp.activeId !== spaceId || sp.tab !== 'chaos') return;
    const root = document.getElementById('sp-body');
    if (!root) return;
    const mode = root.dataset.sillyMode || 'chaos';
    const posts = visiblePosts(spaceId,mode);
    const points = contents(spaceId,'silly_points').filter(p=>p.authorId===currentUser.id).reduce((sum,p)=>sum+Number(p.points||0),0);
    const dare = root.dataset.sillyDare || '';
    const dark = midnight();
    const header = '<section class="silly-hero'+(dark?' is-midnight':'')+'"><div class="silly-particles" aria-hidden="true">'+Array.from({length:16},(_,i)=>'<button type="button" class="silly-particle" tabindex="-1" aria-label="Giggle particle" style="--i:'+i+'">✦</button>').join('')+'</div>'+
      '<div class="silly-hero__eyebrow"><span class="silly-live-dot"></span> ANONYMOUS NONSENSE CLUB <span class="silly-points">✦ '+points+' pts</span></div>'+
      '<h2>WELCOME TO<br><em>THE VOID.</em></h2><p>Drop your dignity at the door. Nobody knows who typed that. Keep it silly, never cruel.</p>'+
      (dark?'<div class="silly-midnight-banner">🌚 UK MIDNIGHT MODE · EXTRA GOBLIN ENERGY</div>':'')+
      '<div class="silly-hero__actions"><button type="button" class="silly-bored" data-silly-action="dare">🎲 I’M BORED</button><button type="button" class="silly-theme-cycle" data-silly-action="theme">🎨 Change vibe</button></div></section>'+
      '<section class="silly-mode-switch" role="tablist" aria-label="Silly feed mode">'+MODES.map(([key,label,desc])=>'<button type="button" role="tab" aria-selected="'+(mode===key)+'" class="'+(mode===key?'is-active':'')+'" data-silly-mode="'+key+'"><b>'+label+'</b><small>'+desc+'</small></button>').join('')+'</section>'+
      '<section class="silly-composer"><div class="silly-composer__top"><span>YOUR GHOSTLY THOUGHT</span><label><input type="checkbox" id="silly-filter-toggle" '+(root.dataset.sillyFilter!=='off'?'checked':'')+'> Silly Filter ✨</label></div>'+
      '<form id="silly-post-form"><textarea id="silly-post-text" maxlength="'+(dark?'1200':'420')+'" rows="3" placeholder="'+(mode==='whisper'?'It is 3:07am and the fridge just looked at me funny…':mode==='roast'?'Roast the situation, not a person’s identity…':'Say something the group chat cannot recover from…')+'"></textarea>'+
      '<div class="silly-composer__foot"><span id="silly-char-count">0 / '+(dark?'1200':'420')+'</span><button type="submit">Release the goblin ↗</button></div></form>'+
      '<p class="silly-safety-note">No real names, handles, phone numbers, locations or private screenshots. Anonymous does not mean consequence-free.</p></section>'+
      (dare?'<section class="silly-dare-card"><span>🎯 YOUR CURRENT DARE</span><p>'+esc(dare)+'</p><button type="button" data-silly-action="complete-dare">I DID THE THING · +10 PTS</button></section>':'')+
      '<section class="silly-feed-head"><div><span>THE FEED IS COOKING</span><h3>'+({chaos:'Fresh chaos',whisper:'Whispers from the void',roast:'The roast pit'}[mode])+'</h3></div><button type="button" data-silly-action="refresh">↻ Refresh</button></section>'+
      (posts.length?'<div class="silly-feed">'+posts.map((p,i)=>card(p,spaceId,i)).join('')+'</div>':'<div class="silly-empty"><div class="silly-empty__orb">🫧</div><b>It's suspiciously peaceful in here.</b><p>Be the first ghost to leave a little nonsense.</p></div>')+
      '<div class="silly-footer-note">THE ONLY RULE: MAKE IT FUNNY, NOT PERSONAL.</div><div id="silly-toast" role="status" hidden></div>';
    root.dataset.sillyMode = mode;
    root.innerHTML = header;
    const text = root.querySelector('#silly-post-text'), count = root.querySelector('#silly-char-count');
    text?.addEventListener('input',()=>{if(count)count.textContent=text.value.length+' / '+text.maxLength;});
    root.querySelector('#silly-filter-toggle')?.addEventListener('change',event=>{root.dataset.sillyFilter=event.target.checked?'on':'off';});
    root.querySelectorAll('.silly-particle').forEach(p=>p.addEventListener('click',()=>{boop();scatter(p);p.classList.add('is-giggling');setTimeout(()=>p.classList.remove('is-giggling'),700);}));
    const form = root.querySelector('#silly-post-form');
    form?.addEventListener('submit', async event=>{
      event.preventDefault();
      const raw = text.value.trim();
      if (!raw) { toast('The void needs at least one word.'); return; }
      if (/(https?:\/\/|www\.|@[\w.]{2,}|\b\+?\d[\d\s().-]{7,}\b)/i.test(raw)) { toast('Keep identifying links, handles and phone numbers out of the void.'); return; }
      const modeNow = root.dataset.sillyMode || 'chaos';
      let message = raw;
      if (root.querySelector('#silly-filter-toggle')?.checked) message = rewrite(message);
      if (modeNow === 'whisper' && !/\b(3\s?am|3:\d\d|midnight|sleepy|dream|fridge|brain|why|😭|🫠|🥲)\b/i.test(message)) message = 'It is 3am and my brain is whispering: ' + message + ' …why am I awake 😭';
      if (modeNow === 'roast' && /\b(my|your|their) (face|body|weight|skin|race|religion|disability)\b/i.test(message)) { toast('Roast the chaos, not somebody’s body or identity.'); return; }
      const payload = {text:message,alias:aliasFor(spaceId),mode:modeNow,at:Date.now(),lols:0,legendary:false,expiresAt:new Date(Date.now()+86400000).toISOString()};
      const button=form.querySelector('button[type="submit"]'); button.disabled=true; button.textContent='Releasing…';
      const result=await Server.submit('space.post',{spaceId,kind:'silly_post',payload});
      button.disabled=false; button.textContent='Release the goblin ↗';
      if (!result?.ok) { toast(result?.error || 'Could not post. Check your connection and Space permissions.'); return; }
      boop(); scatter(button); root.dataset.sillyDare='';
      render(spaceId); toast('Your ghost has entered the void 👻');
    });
  }

  async function createContent(spaceId,kind,payload) {
    const result = await Server.submit('space.post',{spaceId,kind,payload});
    if (!result?.ok) { toast(result?.error || 'Could not save that chaos.'); return false; }
    return true;
  }
  document.addEventListener('click',async event=>{
    if (!isSillyOpen()) return;
    const target=event.target instanceof Element?event.target:null;
    if (!target) return;
    const modeBtn=target.closest('[data-silly-mode]');
    const actionBtn=target.closest('[data-silly-action]');
    const reactBtn=target.closest('[data-silly-react]');
    const replyBtn=target.closest('[data-silly-reply]');
    const sendReply=target.closest('[data-silly-send-reply]');
    if (!(modeBtn||actionBtn||reactBtn||replyBtn||sendReply)) return;
    event.preventDefault(); event.stopPropagation(); boop(); scatter(target);
    const spaceId=sp.activeId, root=document.getElementById('sp-body');
    if (modeBtn) { root.dataset.sillyMode=modeBtn.dataset.sillyMode; render(spaceId); return; }
    if (actionBtn) {
      const action=actionBtn.dataset.sillyAction;
      if (action==='dare') {
        const dare=DARES[Math.floor(Math.random()*DARES.length)];
        root.dataset.sillyDare=dare; render(spaceId); toast('Your mission has arrived. Be ridiculous.'); return;
      }
      if (action==='complete-dare') {
        const dare=root.dataset.sillyDare||'';
        if (!dare) return;
        if (await createContent(spaceId,'silly_points',{points:10,reason:'dare-completed',at:Date.now(),dare:dare})) {
          root.dataset.sillyDare=''; render(spaceId); toast('+10 Silly Points. A scholar of nonsense.'); return;
        }
      }
      if (action==='refresh') {
        const ok=await Server.load();
        if (ok) render(spaceId); else toast('Refresh failed. Try again in a moment.');
        return;
      }
      if (action==='theme') {
        const screen=document.getElementById('screen-space');
        const themes=['#F4C879','#DDA0FF','#8EE6C7'];
        const current=screen.dataset.sillyAccent||themes[0];
        const next=themes[(themes.indexOf(current)+1)%themes.length];
        screen.dataset.sillyAccent=next; screen.style.setProperty('--silly-accent',next);
        try { localStorage.setItem('tweaklr-silly-accent-'+spaceId,next); } catch(_){}
        return;
      }
    }
    if (reactBtn) {
      const postId=reactBtn.dataset.postId, kind=reactBtn.dataset.sillyReact;
      if (reactions(spaceId,postId).some(r=>r.authorId===currentUser.id)) { toast('One reaction per ghost per post.'); return; }
      const post=contents(spaceId,'silly_post').find(p=>p.id===postId);
      if (!post) return;
      const ok=await createContent(spaceId,'silly_reaction',{postId,reaction:kind,at:Date.now()});
      if (ok) {
        const all=reactions(spaceId,postId);
        const lols=all.filter(r=>r.reaction==='lol').length;
        if (lols>=20 && !post.legendary) { post.legendary=true; post.lols=lols; }
        render(spaceId);
      }
      return;
    }
    if (replyBtn) {
      const box=document.querySelector('[data-reply-box="'+CSS.escape(replyBtn.dataset.sillyReply)+'"]');
      if (box) { box.hidden=!box.hidden; box.querySelector('textarea')?.focus(); }
      return;
    }
    if (sendReply) {
      const postId=sendReply.dataset.sillySendReply;
      const box=document.querySelector('[data-reply-box="'+CSS.escape(postId)+'"]');
      const input=box?.querySelector('textarea'), value=input?.value.trim();
      if (!value) { toast('Your bubble needs a little text.'); return; }
      if (/(https?:\/\/|www\.|@[\w.]{2,}|\b\+?\d[\d\s().-]{7,}\b)/i.test(value)) { toast('Keep identifying details out of the void.'); return; }
      if (await createContent(spaceId,'silly_reply',{postId,text:value,at:Date.now(),alias:aliasFor(spaceId)})) render(spaceId);
    }
  });

  const originalChaos = VIEWS.silly.chaos;
  VIEWS.silly.chaos = function(space) {
    const result = '<div class="silly-root" data-silly-mode="chaos"><div class="silly-loading">Summoning the goblins…</div></div>';
    setTimeout(async()=>{
      if (!isSillyOpen() || sp.activeId!==space.id || sp.tab!=='chaos') return;
      const screen=document.getElementById('screen-space');
      try {
        const accent=localStorage.getItem('tweaklr-silly-accent-'+space.id);
        if (accent) { screen.dataset.sillyAccent=accent; screen.style.setProperty('--silly-accent',accent); }
      } catch(_){}
      await Server.load();
      const root=document.getElementById('sp-body');
      if (!root || sp.activeId!==space.id || sp.tab!=='chaos') return;
      root.classList.add('silly-root'); root.dataset.sillyMode='chaos';
      render(space.id);
    },0);
    return result;
  };
  // Silly is a ghost-only room: hide its member directory tab, without changing other Spaces.
  const style=document.createElement('style');
  style.textContent='#screen-space[data-nature="silly"] #sp-tabs [data-sp="tab:people"]{display:none!important} #screen-space[data-nature="silly"] #sp-tabs{--silly-tabs:1}';
  document.head.appendChild(style);
  // Update UK midnight mode on minute boundaries while the Silly feed is visible.
  setInterval(()=>{if(isSillyOpen()&&sp.tab==='chaos')render(sp.activeId);},60000);
})();
