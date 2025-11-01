// App v6 (no CSV): uses hardcoded sources from config.js; includes News Preview + Chat
const CFG = window.APP_CONFIG;
const panelsRoot = document.getElementById('panels');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpdatedEl = document.getElementById('last-updated');

function buildPanels(){
  const gradients={CODM:'linear-gradient(135deg,#0B0F14,#1F2937)',PUBG:'linear-gradient(135deg,#1b1200,#3d2a00)',FREEFIRE:'linear-gradient(135deg,#0f0f0f,#1f1f1f)',DELTA:'linear-gradient(135deg,#012f2a,#033e35)'};
  const make=(k,g)=>`
  <section id="panel-${k}" class="game-panel hidden">
    <div class="hero" style="background-image:${gradients[k]}">
      <div class="flex items-center justify-between gap-4">
        <div><h2 class="text-2xl font-semibold">${g.name}</h2><p class="opacity-80 text-sm">Community sentiment, latest posts & news.</p></div>
        <div class="gauge-wrap"><canvas id="gauge-${k}"></canvas></div>
      </div>
      <div class="brandbar mt-4" style="background:linear-gradient(90deg,#ffffff66,#ffffff00)"></div>
    </div>
    <div class="grid md:grid-cols-3 gap-6 mt-4">
      <div class="md:col-span-2 card">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">Latest Posts</h3>
          <div class="text-xs pill opacity-70">Reddit + X (Threads optional)</div>
        </div>
        <div id="feed-${k}" class="grid gap-4"></div>
      </div>
      <aside class="card">
        <h3 class="font-semibold">News</h3>
        <div id="news-${k}" class="mt-2 grid gap-3"></div>
      </aside>
    </div>
  </section>`;
  panelsRoot.innerHTML = Object.entries(CFG.games).map(([k,g])=>make(k,g)).join('');
}
buildPanels();

// Navigation
document.querySelectorAll('nav [data-tab]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.tab)));
function showPanel(key){
  document.querySelectorAll('.game-panel').forEach(p=>p.classList.add('hidden'));
  const el=document.getElementById(`panel-${key}`); if(el) el.classList.remove('hidden');
  localStorage.setItem('pulse_tab', key);
  renderNewsFor(key);
}
showPanel(localStorage.getItem('pulse_tab')||'CODM');

function setUpdated(ts){ lastUpdatedEl.textContent = `Updated ${new Date(ts).toLocaleString()}`; }

// Helpers
const gauges={};
function makeGauge(id,val){
  const ctx=document.getElementById(id); if(!ctx) return;
  if(gauges[id]) gauges[id].destroy();
  const v=Math.max(-5,Math.min(5,val||0)); const pos=Math.max(0,v+2.5),neg=Math.max(0,2.5-v);
  gauges[id]=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[pos,neg,5],borderWidth:0,backgroundColor:['#22c55e','#ef4444','#e5e7eb']} ]},options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false}}}});
}
function postCard(p, sent){
  const cls = sent>2 ? 'text-emerald-600' : sent<-2 ? 'text-rose-600' : 'text-amber-600';
  const dom = p.domain ? `<span class="pill">${p.domain}</span>` : '';
  return `<article class="card">
    <div class="flex items-start gap-4">
      <div class="flex-1">
        <div class="flex items-center gap-2 text-xs opacity-70 mb-1">${dom}<span class="pill">${new Date(p.created).toLocaleString()}</span></div>
        <h4 class="font-semibold"><a class="text-sky-600" href="${p.url||'#'}" target="_blank" rel="noopener">${p.title||p.text?.slice(0,80)||'Post'}</a></h4>
        ${p.text ? `<p class="text-sm mt-1 opacity-90">${p.text.slice(0,280)}</p>` : ''}
        <div class="mt-2 ${cls} text-sm font-medium">Sentiment: ${sent>0?'+':''}${sent.toFixed(1)}</div>
      </div>
    </div>
  </article>`;
}
async function renderNewsFor(key){
  const g=CFG.games[key]; const t=document.getElementById(`news-${key}`); if(!g||!t) return;

  // PREVIEW via Worker
  let previewHTML = "";
  if (CFG.proxies.news && g.newsPage) {
    try {
      const r = await fetch(CFG.proxies.news, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ url: g.newsPage, limit: 6 })
      });
      const list = r.ok ? await r.json() : [];
      if (list.length) {
        previewHTML = `
          <div class="mb-3">
            <h4 class="font-semibold">Latest headlines</h4>
            <div class="grid gap-2 mt-2">
              ${list.map(n => `
                <a href="${n.href}" target="_blank" rel="noopener"
                   class="card hover:ring-2 hover:ring-sky-400">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <div class="text-sm font-medium">${n.title}</div>
                      <div class="text-xs opacity-60 mt-1">${n.src}</div>
                    </div>
                    <span class="pill">Open ↗</span>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>`;
      }
    } catch (e) {}
  }

  t.innerHTML = previewHTML;
}

async function callProxy(url, payload){
  try{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok) return [];
    return await r.json();
  }catch(e){ return []; }
}

async function loadAll(){
  const now=Date.now(); setUpdated(now);
  const rows=[];

  for(const [key,g] of Object.entries(CFG.games)){
    const redditPosts = await callProxy(CFG.proxies.reddit, { game:key, subreddits:g.subreddits||[], limit:25 });
    const twitterPosts = await callProxy(CFG.proxies.twitter, { game:key, handles:g.twitter?.handles||[], hashtags:g.twitter?.hashtags||[], limit:50 });
    const threadsPosts = await callProxy(CFG.proxies.threads, { game:key, handles:g.threads?.handles||[], limit:40 });

    const feed = [...redditPosts, ...twitterPosts, ...threadsPosts]
      .map(p=>({ ...p, created: p.created_at || p.created || new Date().toISOString(), domain: p.domain || (p.source||'') }))
      .sort((a,b)=> new Date(b.created) - new Date(a.created))
      .slice(0, 30);

    let sum=0; for(const p of feed){ const s=await sentiment(`${p.title||''} ${p.text||''}`); p._sent=s.score; sum+=s.score; }
    const avg = feed.length ? sum/feed.length : null;

    document.getElementById(`feed-${key}`).innerHTML = feed.length ? feed.map(p=>postCard(p,p._sent)).join('') : '<div class="text-sm opacity-70">No posts received from proxies.</div>';
    makeGauge(`gauge-${key}`, avg??0);

    rows.push({ name:g.name,
      reddit: redditPosts.length? (redditPosts.reduce((a,b)=>a+(b._sent||0),0)/redditPosts.length):null,
      twitter: twitterPosts.length? (twitterPosts.reduce((a,b)=>a+(b._sent||0),0)/twitterPosts.length):null,
      threads: threadsPosts.length? (threadsPosts.reduce((a,b)=>a+(b._sent||0),0)/threadsPosts.length):null,
      overall: avg, posts: feed.length, ts: now });
  }

  const tbody=document.getElementById('compareBody');
  const fmt=v=>(v===null||v===undefined||Number.isNaN(v))?'—':(v>0?'+':'')+v.toFixed(2);
  tbody.innerHTML = rows.map(r=>`<tr class="border-t border-zinc-200"><td class="py-2 pr-4 font-medium">${r.name}</td><td class="py-2 pr-4">${fmt(r.reddit)}</td><td class="py-2 pr-4">${fmt(r.twitter)}</td><td class="py-2 pr-4">${fmt(r.threads)}</td><td class="py-2 pr-4 font-semibold">${fmt(r.overall)}</td><td class="py-2 pr-4">${r.posts}</td><td class="py-2 pr-4">${new Date(r.ts).toLocaleString()}</td></tr>`).join('');
}
refreshBtn.addEventListener('click', ()=> loadAll());
loadAll();

// Chatbox
const chatCard=document.getElementById('chatCard');
const openChat=document.getElementById('openChat');
const closeChat=document.getElementById('closeChat');
const chatLog=document.getElementById('chatLog');
const chatInput=document.getElementById('chatInput');
const chatSend=document.getElementById('chatSend');

openChat?.addEventListener('click',()=>{ chatCard.classList.remove('hidden'); openChat.classList.add('hidden'); });
closeChat?.addEventListener('click',()=>{ chatCard.classList.add('hidden'); openChat.classList.remove('hidden'); });

function appendChat(role, text){
  const who= role==='user' ? 'You' : 'Pulse';
  const item=document.createElement('div');
  item.className='mb-2'; item.innerHTML=`<div class="text-xs opacity-60 mb-1">${who}</div><div class="p-2 rounded-lg ${role==='user'?'bg-sky-50':'bg-zinc-100'} border">${text}</div>`;
  chatLog.appendChild(item); chatLog.scrollTop=chatLog.scrollHeight;
}

chatSend?.addEventListener('click', async ()=>{
  const q=chatInput.value.trim(); if(!q) return; chatInput.value='';
  appendChat('user', q);
  try{
    const r=await fetch(CFG.proxies.chat,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});
    const d=await r.json(); appendChat('assistant', d.answer || 'No response.'); 
  }catch(e){ appendChat('assistant','Error calling chat proxy.'); }
});