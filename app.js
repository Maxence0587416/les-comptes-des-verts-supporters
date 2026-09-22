(function(){
 const C=window.VERTS_CLOUD_CONFIG||{}; const sb=window.supabase.createClient(C.url,C.publishableKey); const app=document.getElementById('app');
 const fmt=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let profile=null;
 async function boot(){
   const { data: { session }, error } = await sb.auth.getSession();
   if(error) console.error(error);
   if(session){
     await loadProfile();
     return;
   }
   login();
 }
 function login(msg=''){
  app.innerHTML=`
    <div class="wrap">
      <div class="top">
        <h1>🟢 Les comptes des Verts</h1>
        <div class="small">Espace supporter</div>
      </div>

      <div class="card">
        <h2>Connexion</h2>
        <p>Entre ton adresse email et ton mot de passe.</p>

        <input id="email" class="input" type="email" placeholder="ton@email.fr">
        <input id="password" class="input" type="password" placeholder="Mot de passe">

        <button id="send" class="btn yes">Se connecter</button>

        <div id="status" class="status ${msg?'':'hidden'}">${esc(msg)}</div>
      </div>
    </div>`;

  document.getElementById('send').onclick=async()=>{
    const email=document.getElementById('email').value.trim().toLowerCase();
    const password=document.getElementById('password').value;

    if(!email || !password){
      document.getElementById('status').classList.remove('hidden');
      document.getElementById('status').textContent='Entre ton email et ton mot de passe.';
      return;
    }

    const {error}=await sb.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      document.getElementById('status').classList.remove('hidden');
      document.getElementById('status').textContent='Erreur de connexion : '+error.message;
      return;
    }

    await loadProfile();
  };
}
async function loadProfile(){
  const {data:{user}}=await sb.auth.getUser();

  if(!user){
    return login();
  }

  const r=await sb
    .from('supporters')
    .select('id,name,email,auth_user_id')
    .eq('auth_user_id',user.id)
    .maybeSingle();

  if(r.error||!r.data){
    return login('Ce compte n’est pas encore associé à un supporter. Demande au responsable de vérifier ton compte.');
  }

  profile=r.data;
  await renderHome();
}
 async function renderHome(){
  const matches=(await sb.from('matches').select('id,name,date,opponent,stadium,venue,competition,season,closed,ticketing_opens_at,match_starts_at').eq('closed',false).order('date',{ascending:true})).data||[];
  const att=(await sb.from('match_attendance').select('match_id,answer,updated_at').eq('supporter_id',profile.id)).data||[];
  const ticketsResult=await sb.from('tickets').select('id,match_id,date,match,tribune,price').eq('supporter_id',profile.id).eq('owner_ticket',false).order('date',{ascending:false});
if(ticketsResult.error) alert('ERREUR BILLETS : '+ticketsResult.error.message);
const tickets=ticketsResult.data||[];
  const paysResult=await sb.from('payments').select('id,date,amount,note').eq('supporter_id',profile.id).order('date',{ascending:false});
if(paysResult.error) alert('ERREUR PAIEMENTS : '+paysResult.error.message);
const pays=paysResult.data||[];
  const ticketTotal=tickets.reduce((s,t)=>s+Number(t.price||0),0), paid=pays.reduce((s,p)=>s+Number(p.amount||0),0), remaining=Math.max(ticketTotal-paid,0);
  const attMap=Object.fromEntries(att.map(a=>[a.match_id,a.answer]));
  app.innerHTML=`<div class="wrap"><div class="top"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h1>🟢 Les comptes des Verts</h1><div class="small">Bonjour ${esc(profile.name)}</div></div><button id="logout" class="btn no">Déconnexion</button></div></div>
  <div class="card"><h2>Mes comptes</h2><div class="money">${fmt(remaining)}</div><div class="small">Reste à payer sur les billets attribués</div><div style="margin-top:10px">Total des billets : <b>${fmt(ticketTotal)}</b> · Total payé : <b>${fmt(paid)}</b></div>${tickets.length?tickets.map(t=>`<div class="ticket"><b>${esc(t.match||'Match')}</b><br><span class="small">${esc(t.date||'')} · ${esc(t.tribune||'Tribune à confirmer')}</span><div style="margin-top:8px">Prix du billet : <b>${fmt(t.price)}</b></div></div>`).join(''):'<div class="small" style="margin-top:10px">Aucun billet attribué pour le moment.</div>'}<h3 style="margin-top:22px">Mes remboursements</h3>${pays.length?pays.map(p=>`<div class="ticket"><b>${esc(p.note||'Remboursement')}</b><br><span class="small">Date du remboursement : ${esc(p.date||'Date non renseignée')}</span><div style="margin-top:8px">Montant remboursé : <b>${fmt(p.amount)}</b></div></div>`).join(''):'<div class="small" style="margin-top:10px">Aucun remboursement enregistré pour le moment.</div>'}</div>
  <div class="card"><h2>Les prochains matchs</h2>${matches.filter(m=>{const deadline=m.ticketing_opens_at?new Date(m.ticketing_opens_at):null;const matchDate=m.match_starts_at?new Date(m.match_starts_at):(m.date?new Date(m.date+'T23:59:59'):null);const expired=(deadline&&new Date()>=deadline)||(matchDate&&new Date()>=matchDate);return !expired||attMap[m.id]==='yes';}).length?matches.filter(m=>{const deadline=m.ticketing_opens_at?new Date(m.ticketing_opens_at):null;const matchDate=m.match_starts_at?new Date(m.match_starts_at):(m.date?new Date(m.date+'T23:59:59'):null);const expired=(deadline&&new Date()>=deadline)||(matchDate&&new Date()>=matchDate);return !expired||attMap[m.id]==='yes';}).map(m=>{const deadline=m.ticketing_opens_at?new Date(m.ticketing_opens_at):null;const expired=deadline&&new Date()>=deadline;const ticket=tickets.find(t=>t.match_id===m.id);return `<div class="match"><h3>${esc(m.name)}</h3><div class="small">${esc(m.match_starts_at?new Date(m.match_starts_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):m.date||'')} · ${esc(m.venue||m.stadium||'Stade non renseigné')}${m.opponent?' · '+esc(m.opponent):''}</div>${!expired?`<div class="actions"><button class="btn yes ${attMap[m.id]==='yes'?'selected':''}" onclick="answer('${m.id}','yes')">Je veux y aller</button><button class="btn no ${attMap[m.id]==='no'?'selected':''}" onclick="answer('${m.id}','no')">Je ne veux / peux pas y aller</button></div>${deadline?`<div class="status">Réponse possible jusqu'au ${deadline.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}.</div>`:''}`:ticket?`<div class="status">✅ Billet pris · Tribune : ${esc(ticket.tribune||'Non renseignée')} · Prix : ${fmt(ticket.price)}</div>`:`<div class="status">⏳ Billet en attente</div>`}</div>`;}).join(''):'<div class="small">Aucun match ouvert pour le moment.</div>'}</div></div>`;
  document.getElementById('logout').onclick=async()=>{await sb.auth.signOut();login()};
 }
 window.answer=async(matchId,answer)=>{const r=await sb.from('match_attendance').upsert({match_id:matchId,supporter_id:profile.id,answer},{onConflict:'match_id,supporter_id'});if(r.error){alert('Impossible d’enregistrer la réponse : '+r.error.message);return}await renderHome()};
 sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(loadProfile,0)});
 boot();
})();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
