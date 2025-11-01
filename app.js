/* GenAI Campus v2.3 (FULL) — videos + certificate + robust YouTube embed */
console.log('%cGenAI Campus v2.3 FULL','background:#0f1422;color:#7aa2f7;padding:4px 8px;border:1px solid #2a3868;border-radius:6px');

const $  = (q)=>document.querySelector(q);
const $$ = (q)=>Array.from(document.querySelectorAll(q));

const store = {
  get(){ try {return JSON.parse(localStorage.getItem('genai-campus')||'{}')} catch(e){return {}} },
  set(data){ localStorage.setItem('genai-campus', JSON.stringify(data)); },
  clear(){ localStorage.removeItem('genai-campus'); }
};

const state = {
  course:  window.GENAI_COURSE || [],
  projects:window.GENAI_PROJECTS || [],
  progress:0,
  level:   0,
  mastery: {},
  badges:  [],
  streak:  0,
  name:    "",
  theme:   "starter",
  certificate: null
};

document.addEventListener('DOMContentLoaded', init);

function init(){
  Object.assign(state, store.get());
  bindTabs();
  renderStats();
  renderLessonList();
  renderProjects();
  bindHome();
  bindProfile();
  bindPlayground();
  applyTheme();
  ensureCertificateUI();
  updateCertificateCTA();
}

/* ---------------- Tabs & Navigation ---------------- */
function bindTabs(){
  const map={ "tab-home":"view-home","tab-learn":"view-learn","tab-practice":"view-practice","tab-projects":"view-projects","tab-profile":"view-profile" };
  Object.entries(map).forEach(([btnId,viewId])=>{
    document.getElementById(btnId).addEventListener('click', ()=>{
      $$('.tab').forEach(t=>t.classList.remove('active'));
      $$('.view').forEach(v=>v.classList.remove('active'));
      document.getElementById(btnId).classList.add('active');
      document.getElementById(viewId).classList.add('active');
    });
  });
}
function navigateTo(view){
  $$('.tab').forEach(t=>t.classList.remove('active'));
  $$('.view').forEach(v=>v.classList.remove('active'));
  $(`#tab-${view}`).classList.add('active');
  $(`#view-${view}`).classList.add('active');
}

/* ---------------- Home ---------------- */
function bindHome(){ $('#cta-start').addEventListener('click', ()=> navigateTo('learn')); }

function renderStats(){
  const total = state.course.length;
  const completed = Object.values(state.mastery).filter(m=>m&&m.done).length;
  state.progress = Math.round((completed/total)*100)||0;

  $('#stat-lessons').textContent   = String(total);
  $('#stat-progress').textContent  = state.progress + '%';
  $('#stat-streak').textContent    = state.streak || 0;

  const node = $('#achievements'); node.innerHTML='';
  (state.badges||[]).forEach(b=>{ const s=document.createElement('span'); s.className='badge'; s.textContent=b; node.appendChild(s); });

  $('#footer-level').textContent = 'Level ' + getLevel().level;

  store.set(state);
  updateCertificateCTA();
}

/* ---------------- Lessons ---------------- */
function renderLessonList(){
  const list = $('#lesson-list'); list.innerHTML='';
  state.course.forEach(lesson=>{
    const item = document.createElement('div');
    item.className='lesson-item';
    item.innerHTML = `<div class="title">${lesson.title}</div><div class="pill">${lesson.time}</div>`;
    item.addEventListener('click', ()=> openLesson(lesson.id));
    list.appendChild(item);
  });
}

function asVideoArray(v){ if(!v) return []; if(Array.isArray(v)) return v; if(typeof v==='object') return [v]; return []; }
function extractYouTubeId(url){
  if(!url) return null;
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/embed\/([^?]+)/);
  return m ? m[1] : null;
}

function openLesson(id){
  const lesson = state.course.find(l => l.id === id);
  const pane = $('#lesson-content'); 
  pane.innerHTML = lesson.content;

  // --- Robust multi-video embed (fixes Error 153) ---
  const videos = asVideoArray(lesson.video);
  if(videos.length){
    const wrap = document.createElement('div');
    wrap.style.display='grid'; wrap.style.gap='10px';

    videos.slice(0,2).forEach(v=>{
      const vid = extractYouTubeId(v.url);
      if(!vid) return;

      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height= '360';
      iframe.style.borderRadius='12px';
      iframe.style.margin='8px 0 8px';

      const start  = Number(v.start || 0);
      const origin = encodeURIComponent(location.origin);
      const src = `https://www.youtube-nocookie.com/embed/${vid}` +
                  `?rel=0&modestbranding=1&playsinline=1&start=${start}` +
                  `&enablejsapi=1&origin=${origin}`;

      iframe.src = src;
      iframe.title = v.title || 'Lesson video';
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      iframe.allowFullscreen = true;

      let loaded = false;
      iframe.addEventListener('load', ()=>{ loaded = true; });

      // Fallback if the embed is blocked
      setTimeout(()=>{
        if(!loaded){
          const box = document.createElement('div');
          box.style.padding='16px';
          box.style.border='1px dashed #334';
          box.style.borderRadius='12px';
          box.innerHTML = `
            <div style="margin-bottom:8px;color:#b7c0d8">
              Couldn’t load the embedded player (blocked by privacy/network). 
            </div>
            <a href="https://www.youtube.com/watch?v=${vid}&t=${start}s"
               target="_blank" rel="noopener"
               style="display:inline-block;padding:8px 12px;border-radius:10px;border:1px solid #2a3868">
               Watch on YouTube
            </a>`;
          wrap.replaceChild(box, iframe);
        }
      }, 3000);

      wrap.appendChild(iframe);
    });

    pane.prepend(wrap);
  }

  // Checkpoints
  const cp = $('#checkpoint'); cp.innerHTML='';
  lesson.questions.forEach((q,i)=> cp.appendChild(renderQuestion(q,id,i)));
  cp.classList.remove('hidden');
}

function renderQuestion(q, lessonId, idx){
  const wrap=document.createElement('div'); wrap.className='q';
  const title=document.createElement('h4'); title.textContent=`Check ${idx+1}`; wrap.appendChild(title);

  if(q.type==='mcq'){
    const p=document.createElement('p'); p.textContent=q.prompt; wrap.appendChild(p);
    q.options.forEach((opt,i)=>{
      const btn=document.createElement('button'); btn.textContent=opt; btn.style.marginRight='8px';
      btn.addEventListener('click', ()=>{
        const correct=(i===q.answerIndex);
        btn.style.borderColor = correct? 'var(--accent-2)' : '#6b1c2a';
        btn.style.boxShadow   = correct? 'var(--ring)'     : 'none';
        if(correct){ incrementScore(lessonId,1); toast('Correct! '+(q.explain||'')); maybeCompleteLesson(lessonId); }
        else toast('Not quite. Try again.');
      });
      wrap.appendChild(btn);
    });
    if(q.explain){ const tip=document.createElement('div'); tip.className='small'; tip.textContent='Tip: '+q.explain; wrap.appendChild(tip); }
  } else if(q.type==='text'){
    const p=document.createElement('p'); p.textContent=q.prompt; wrap.appendChild(p);
    const input=document.createElement('input');
    input.placeholder='Type your answer…';
    Object.assign(input.style,{width:'100%',padding:'10px',borderRadius:'10px',border:'1px solid #29314c'});
    wrap.appendChild(input);
    const submit=document.createElement('button'); submit.textContent='Submit'; submit.style.marginTop='8px'; wrap.appendChild(submit);
    submit.addEventListener('click', ()=>{
      const val=(input.value||'').toLowerCase();
      const ok=(q.rubric||[]).some(k=>val.includes(k));
      if(ok){ incrementScore(lessonId,1); toast('Nice – that covers a key idea.'); maybeCompleteLesson(lessonId); }
      else toast('Hint: try including '+(q.rubric?.[0]||'a key term'));
    });
  }
  return wrap;
}

function incrementScore(lessonId, delta){
  const m = state.mastery[lessonId] || {done:false, score:0};
  m.score = Math.min(3,(m.score||0)+delta);
  state.mastery[lessonId]=m; store.set(state);
}
function maybeCompleteLesson(lessonId){
  const m = state.mastery[lessonId];
  if(m.score>=2 && !m.done){
    m.done=true; state.streak=(state.streak||0)+1; toast('Lesson complete!'); gainThemeProgress();
  }
  renderStats(); applyTheme();
}

/* ---------------- Theme & Levels ---------------- */
function getLevel(){
  const p=state.progress||0; let t='starter', level=0;
  if(p>=10){t='bronze';level=1}
  if(p>=40){t='silver';level=2}
  if(p>=70){t='gold';level=3}
  if(p>=100){t='platinum';level=4}
  return {theme:t,level};
}
function rank(n){ return {starter:0,bronze:1,silver:2,gold:3,platinum:4}[n]??0; }

function applyTheme(){
  const {theme}=getLevel();
  document.body.classList.remove('theme-bronze','theme-silver','theme-gold','theme-platinum');
  if(theme!=='starter') document.body.classList.add('theme-'+theme);

  const select=$('#profile-theme');
  if(select){
    const desired=state.theme||'starter';
    const unlocked=getLevel().theme;
    const finalTheme=rank(desired)<=rank(unlocked)?desired:unlocked;
    state.theme=finalTheme;
    document.body.classList.remove('theme-'+desired);
    if(finalTheme!=='starter') document.body.classList.add('theme-'+finalTheme);
    select.value=finalTheme;
  }
}
function gainThemeProgress(){
  document.body.animate([{filter:'brightness(1)'},{filter:'brightness(1.2)'},{filter:'brightness(1)'}],{duration:600});
}

/* ---------------- Playground ---------------- */
function bindPlayground(){
  $('#btn-evaluate').addEventListener('click', ()=>{
    const t=$('#prompt-input').value||'';
    const score=evaluatePrompt(t);
    const feedback=[`Score: ${score}/10`,
      ...(score<7?[
        '- Add constraints (length, tone, format).',
        '- Include examples (few-shot).',
        '- Specify audience & success criteria.'
      ]:[
        'Great structure! Consider adding edge-case tests.'
      ])
    ].join('\n');
    $('#prompt-feedback').textContent=feedback;
    if(score>=8) awardBadge('Prompt Crafter');
  });
}
function evaluatePrompt(t){
  let s=0; const low=t.toLowerCase();
  if(low.includes('you are')||low.includes('act as')) s++;
  if(/output|json|schema|markdown/.test(low)) s++;
  if(/limit|words|bullets|tone|style|audience|format/.test(low)) s++;
  if(/example|few-shot|demonstration|e\.g\./.test(low)) s+=2;
  if(/steps|checklist|plan|chain/.test(low)) s++;
  if(/tests|criteria|acceptance|evaluation/.test(low)) s++;
  if(t.length>140) s++;
  if(/avoid|do not|must/.test(low)) s++;
  if(/context|background/.test(low)) s++;
  return Math.min(10,s);
}

/* ---------------- Projects & Badges ---------------- */
function renderProjects(){
  const wrap=$('#projects'); wrap.innerHTML='';
  state.projects.forEach(p=>{
    const card=document.createElement('div'); card.className='project-card';
    card.innerHTML = `<h3>${p.title}</h3><p>${p.description}</p>
      <div class="actions">
        <button data-id="${p.id}" class="btn-done">Mark Complete</button>
        <span class="small">Reward: ${p.reward}</span>
      </div>`;
    card.querySelector('.btn-done').addEventListener('click', ()=> awardBadge(p.reward));
    wrap.appendChild(card);
  });
}
function awardBadge(name){
  if(!(state.badges||[]).includes(name)){
    state.badges=[...(state.badges||[]),name];
    toast('Badge earned: '+name); renderStats(); applyTheme();
  }
}

/* ---------------- Profile ---------------- */
function bindProfile(){
  const name=$('#profile-name'); name.value=state.name||'';
  name.addEventListener('change', ()=>{ state.name=name.value; store.set(state); updateCertificateCTA(); });

  const theme=$('#profile-theme'); theme.value=state.theme||'starter';
  theme.addEventListener('change', ()=>{
    const desired=theme.value; const unlocked=getLevel().theme;
    if(rank(desired)<=rank(unlocked)){ state.theme=desired; applyTheme(); store.set(state); }
    else { toast('That theme unlocks later!'); theme.value=state.theme; }
  });

  $('#btn-export').addEventListener('click', ()=>{
    const data=JSON.stringify(state,null,2);
    const blob=new Blob([data],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='genai-campus-progress.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });

  $('#btn-import').addEventListener('click', ()=> $('#file-import').click());
  $('#file-import').addEventListener('change', async (e)=>{
    const file=e.target.files[0]; if(!file) return;
    const text=await file.text();
    try{ const data=JSON.parse(text); Object.assign(state,data); store.set(state); location.reload(); }
    catch{ toast('Invalid file.'); }
  });

  $('#btn-reset').addEventListener('click', ()=>{
    if(confirm('Reset all progress?')){ store.clear(); location.reload(); }
  });
}

/* ---------------- Certificate ---------------- */
function updateCertificateCTA(){
  const home=$('#achievements'); if(!home) return;
  const old1=document.getElementById('btn-claim-cert');
  const old2=document.getElementById('btn-view-cert');
  if(old1) old1.remove(); if(old2) old2.remove();

  if(state.progress>=100){
    if(state.certificate){
      const viewBtn=document.createElement('button');
      viewBtn.id='btn-view-cert'; viewBtn.className='cta';
      viewBtn.textContent='View Certificate';
      viewBtn.addEventListener('click', openCertificateModal);
      home.appendChild(viewBtn);
    }else{
      const btn=document.createElement('button');
      btn.id='btn-claim-cert'; btn.className='cta';
      btn.textContent='Claim Your Certificate';
      btn.addEventListener('click', ()=>{
        if(!state.name){ toast('Add your name in Profile first.'); navigateTo('profile'); return; }
        state.certificate=createCertificateRecord(state.name);
        store.set(state); awardBadge('Platinum Certificate'); openCertificateModal();
      });
      home.appendChild(btn);
    }
  }
}
function createCertificateRecord(name){
  const now=new Date();
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,'0');
  const d=String(now.getDate()).padStart(2,'0');
  const rand=Math.floor(1000+Math.random()*9000);
  const number=`GAC-${y}${m}${d}-${rand}`;
  return { number, dateISO: now.toISOString(), name };
}
function ensureCertificateUI(){
  if(document.getElementById('certificate-modal')) return;
  const modal=document.createElement('div'); modal.id='certificate-modal';
  Object.assign(modal.style,{position:'fixed',inset:'0',display:'none',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',zIndex:50});
  modal.innerHTML = `<div id="cert-card" style="background:#0f1422;border:1px solid #2a3868;border-radius:16px;padding:16px;max-width:92vw;">
      <canvas id="cert-canvas" width="1600" height="1131" style="width: min(88vw, 1000px); height: auto; display:block; border-radius:12px; background:#fff"></canvas>
      <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
        <button id="btn-cert-png" class="cta">Download PNG</button>
        <button id="btn-cert-print" class="cta">Print / Save PDF</button>
        <button id="btn-cert-close" class="cta">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-cert-close').addEventListener('click', ()=> document.getElementById('certificate-modal').style.display='none');
  document.getElementById('btn-cert-png').addEventListener('click', ()=>{
    const url=document.getElementById('cert-canvas').toDataURL('image/png');
    const a=document.createElement('a'); a.href=url; a.download='GenAI-Certificate.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });
  document.getElementById('btn-cert-print').addEventListener('click', ()=>{
    const url=document.getElementById('cert-canvas').toDataURL('image/png');
    const w=window.open('','_blank'); w.document.write(`<img src="${url}" style="width:100%">`);
    w.document.close(); w.focus(); setTimeout(()=> w.print(), 300);
  });
}
function openCertificateModal(){ ensureCertificateUI(); drawCertificate(); document.getElementById('certificate-modal').style.display='flex'; }
function drawCertificate(){
  const c=document.getElementById('cert-canvas'); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  const grad=ctx.createLinearGradient(0,0,c.width,c.height); grad.addColorStop(0,'#e8f3ff'); grad.addColorStop(1,'#fef6e7'); ctx.fillStyle=grad; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='#0f3b6f'; ctx.lineWidth=16; ctx.strokeRect(24,24,c.width-48,c.height-48);
  ctx.strokeStyle='#ffd166'; ctx.lineWidth=6; ctx.strokeRect(48,48,c.width-96,c.height-96);

  ctx.fillStyle='#0f3b6f'; ctx.font='bold 72px serif'; ctx.textAlign='center';
  ctx.fillText('Certificate of Mastery', c.width/2, 190);
  ctx.fillStyle='#27314d'; ctx.font='28px sans-serif';
  ctx.fillText('awarded by GenAI Campus', c.width/2, 240);

  const name=(state.certificate?.name||state.name||'Learner').toUpperCase();
  ctx.fillStyle='#111'; ctx.font='bold 64px serif'; ctx.fillText(name, c.width/2, 380);
  ctx.fillStyle='#333'; ctx.font='28px sans-serif';
  ctx.fillText('has successfully completed the Generative AI curriculum', c.width/2, 430);
  ctx.fillText('with full mastery across all modules.', c.width/2, 470);

  const dateISO=state.certificate?.dateISO||new Date().toISOString();
  const dt=new Date(dateISO);
  const dateStr=dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  const number=state.certificate?.number||'GAC-XXXX';

  ctx.textAlign='left';
  ctx.fillStyle='#0f3b6f'; ctx.font='bold 26px sans-serif';
  ctx.fillText(`Date: ${dateStr}`,140,580);
  ctx.fillText(`Certificate No.: ${number}`,140,620);
  ctx.fillText(`Standard: ISO 9001`,140,660);

  ctx.strokeStyle='#27314d'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(140,760); ctx.lineTo(640,760); ctx.stroke();
  ctx.fillStyle='#333'; ctx.font='22px sans-serif'; ctx.fillText('Signature (Learner)',140,790);

  ctx.beginPath(); ctx.moveTo(c.width-640,760); ctx.lineTo(c.width-140,760); ctx.stroke();
  ctx.fillText('Program Director', c.width-640,790);

  drawSeal(ctx, c.width-300, 260);
}
function drawSeal(ctx,cx,cy){
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,110,0,Math.PI*2); ctx.fillStyle='#ffd166'; ctx.fill(); ctx.lineWidth=6; ctx.strokeStyle='#c98a22'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,85,0,Math.PI*2); ctx.fillStyle='#0f3b6f'; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center';
  ctx.fillText('GENAI',cx,cy-10); ctx.font='18px sans-serif'; ctx.fillText('CAMPUS',cx,cy+20);
  ctx.restore();
}

/* ---------------- Utils ---------------- */
function toast(msg){
  const t=document.createElement('div'); t.textContent=msg;
  Object.assign(t.style,{position:'fixed',bottom:'18px',left:'50%',transform:'translateX(-50%)',background:'#121a33',color:'#fff',padding:'10px 14px',border:'1px solid #2a3868',borderRadius:'10px',zIndex:60});
  document.body.appendChild(t); setTimeout(()=>t.remove(),1800);
}
window.addEventListener('storage', ()=> applyTheme());
