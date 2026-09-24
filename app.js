(function(){

  const C=window.VERTS_CLOUD_CONFIG||{};
  const sb=window.supabase.createClient(C.url,C.publishableKey);
  const app=document.getElementById('app');

  const fmt=n=>new Intl.NumberFormat('fr-FR',{
    style:'currency',
    currency:'EUR'
  }).format(Number(n)||0);

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));

  let profile=null;
  let currentPage='home';
  let appData=null;


  /* =========================
     CONNEXION
     ========================= */

  async function boot(){

    const {data:{session},error}=await sb.auth.getSession();

    if(error) console.error(error);

    if(session){
      await loadProfile();
      return;
    }

    login();
  }


  function login(msg=''){

   app.innerHTML=`
  <div class="login-screen">

    <div class="login-hero">

      <div class="login-stadium-overlay"></div>

      <div class="login-brand">

        <div class="brand-ball">⚽</div>

        <h1>
          Les comptes<br>
          <span>des Verts</span>
        </h1>

        <div class="login-subtitle">
          ESPACE SUPPORTER
        </div>

        <div class="login-line"></div>

        <div class="login-passion">
          Fiers d'être Stéphanois
        </div>

      </div>

    </div>


    <div class="login-card">

      <div class="login-title">
        <div class="login-user-icon">●</div>

        <div>
          <h2>Connexion</h2>
          <p>
            Connecte-toi pour retrouver tes matchs<br>
            et tes comptes.
          </p>
        </div>
      </div>


      <div class="login-input-wrap">
        <span class="login-field-icon">✉</span>

        <input
          id="email"
          class="input login-input"
          type="email"
          placeholder="Adresse email"
          autocomplete="email"
        >
      </div>


      <div class="login-input-wrap">
        <span class="login-field-icon">🔒</span>

        <input
          id="password"
          class="input login-input"
          type="password"
          placeholder="Mot de passe"
          autocomplete="current-password"
        >
      </div>


      <button id="send" class="btn yes login-button">
        <span>Se connecter</span>
        <span class="login-arrow">→</span>
      </button>


      <div id="status" class="status ${msg?'':'hidden'}">
        ${esc(msg)}
      </div>

    </div>


    <div class="login-footer">

      <div class="login-quote">
        « Ensemble, toujours plus haut ! »
      </div>

      <div class="login-city">
        SAINT-ÉTIENNE
      </div>

      <div class="login-values">
        PASSION&nbsp;&nbsp;•&nbsp;&nbsp;FIDÉLITÉ&nbsp;&nbsp;•&nbsp;&nbsp;FAMILLE
      </div>

    </div>

  </div>
`;

    document.getElementById('send').onclick=async()=>{

      const email=document
        .getElementById('email')
        .value
        .trim()
        .toLowerCase();

      const password=document
        .getElementById('password')
        .value;


      if(!email||!password){

        const status=document.getElementById('status');

        status.classList.remove('hidden');
        status.textContent='Entre ton email et ton mot de passe.';

        return;
      }


      const {error}=await sb.auth.signInWithPassword({
        email,
        password
      });


      if(error){

        const status=document.getElementById('status');

        status.classList.remove('hidden');
        status.textContent='Erreur de connexion : '+error.message;

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
      .select('id,name,email,auth_user_id,must_change_password')
      .eq('auth_user_id',user.id)
      .maybeSingle();


    if(r.error||!r.data){

      return login(
        'Ce compte n’est pas encore associé à un supporter. Demande au responsable de vérifier ton compte.'
      );
    }


  profile=r.data;

if(profile.must_change_password){
  return changeFirstPassword();
}

await loadData();
  }

  function changeFirstPassword(){

  app.innerHTML=`
    <div class="login-screen">

      <div class="login-hero">
        <div class="login-stadium-overlay"></div>

        <div class="login-brand">
          <div class="brand-ball">⚽</div>

          <h1>
            Les comptes<br>
            <span>des Verts</span>
          </h1>

          <div class="login-subtitle">
            PREMIÈRE CONNEXION
          </div>

          <div class="login-line"></div>

          <div class="login-passion">
            Bienvenue ${esc(profile.name)}
          </div>
        </div>
      </div>


      <div class="login-card">

        <div class="login-title">
          <div class="login-user-icon">🔒</div>

          <div>
            <h2>Choisis ton mot de passe</h2>
            <p>
              Pour sécuriser ton compte, remplace ton mot de passe
              temporaire par ton nouveau mot de passe.
            </p>
          </div>
        </div>


        <div class="login-input-wrap">
          <span class="login-field-icon">🔒</span>

          <input
            id="newPassword"
            class="input login-input"
            type="password"
            placeholder="Nouveau mot de passe"
            autocomplete="new-password"
          >
        </div>


        <div class="login-input-wrap">
          <span class="login-field-icon">🔒</span>

          <input
            id="confirmPassword"
            class="input login-input"
            type="password"
            placeholder="Confirmer le mot de passe"
            autocomplete="new-password"
          >
        </div>


        <button id="saveNewPassword" class="btn yes login-button">
          <span>Valider mon mot de passe</span>
          <span class="login-arrow">→</span>
        </button>


        <div id="passwordStatus" class="status hidden"></div>

      </div>

    </div>
  `;


  document.getElementById('saveNewPassword').onclick=async()=>{

    const password=document.getElementById('newPassword').value;
    const confirmation=document.getElementById('confirmPassword').value;
    const status=document.getElementById('passwordStatus');


    if(password.length<8){
      status.classList.remove('hidden');
      status.textContent='Ton mot de passe doit contenir au moins 8 caractères.';
      return;
    }


    if(password!==confirmation){
      status.classList.remove('hidden');
      status.textContent='Les deux mots de passe ne sont pas identiques.';
      return;
    }


    const {error}=await sb.auth.updateUser({
      password:password
    });


    if(error){
      status.classList.remove('hidden');
      status.textContent='Impossible de modifier le mot de passe : '+error.message;
      return;
    }


    const updateResult=await sb.rpc('finish_first_login');


    if(updateResult.error){
      status.classList.remove('hidden');
      status.textContent='Le mot de passe a été modifié, mais la première connexion n’a pas pu être finalisée.';
      return;
    }


    profile.must_change_password=false;

    await loadData();
  };
}


  /* =========================
     CHARGEMENT DES DONNÉES
     ========================= */

  async function loadData(){

    const matchesResult=await sb
      .from('matches')
      .select('id,name,date,opponent,stadium,venue,competition,season,closed,ticketing_opens_at,match_starts_at')
      .eq('closed',false)
      .order('date',{ascending:true});


    const attendanceResult=await sb
      .from('match_attendance')
      .select('match_id,answer,updated_at')
      .eq('supporter_id',profile.id);


    const ticketsResult=await sb
      .from('tickets')
      .select('id,match_id,date,match,tribune,price')
      .eq('supporter_id',profile.id)
      .order('date',{ascending:false});


    if(ticketsResult.error){
      alert('ERREUR BILLETS : '+ticketsResult.error.message);
    }


    const paymentsResult=await sb
      .from('payments')
      .select('id,date,amount,note')
      .eq('supporter_id',profile.id)
      .order('date',{ascending:false});


    if(paymentsResult.error){
      alert('ERREUR PAIEMENTS : '+paymentsResult.error.message);
    }


    const matches=matchesResult.data||[];
    const att=attendanceResult.data||[];
    const tickets=ticketsResult.data||[];
    const pays=paymentsResult.data||[];


    const ticketTotal=tickets.reduce(
      (s,t)=>s+Number(t.price||0),
      0
    );

    const paid=pays.reduce(
      (s,p)=>s+Number(p.amount||0),
      0
    );

    const remaining=Math.max(ticketTotal-paid,0);

    const attMap=Object.fromEntries(
      att.map(a=>[a.match_id,a.answer])
    );


    appData={
      matches,
      att,
      tickets,
      pays,
      ticketTotal,
      paid,
      remaining,
      attMap
    };


    renderApp();
  }



  /* =========================
     STRUCTURE DE L'APPLICATION
     ========================= */

  function renderApp(){

    app.innerHTML=`
      <div class="supporter-app">


        <main id="pageContent" class="page-content"></main>


        <nav class="bottom-nav">

          <button
            class="nav-item"
            data-page="home"
            onclick="changePage('home')"
          >
            <span class="nav-icon">⌂</span>
            <span>Accueil</span>
          </button>


          <button
            class="nav-item"
            data-page="matches"
            onclick="changePage('matches')"
          >
            <span class="nav-icon">⚽</span>
            <span>Matchs</span>
          </button>


          <button
            class="nav-item"
            data-page="accounts"
            onclick="changePage('accounts')"
          >
            <span class="nav-icon">€</span>
            <span>Comptes</span>
          </button>


          <button
            class="nav-item"
            data-page="more"
            onclick="changePage('more')"
          >
            <span class="nav-icon">•••</span>
            <span>Plus</span>
          </button>

        </nav>

      </div>
    `;

    renderPage();
  }



  window.changePage=function(page){

    currentPage=page;

    renderPage();

    window.scrollTo({
      top:0,
      behavior:'smooth'
    });
  };



  function renderPage(){

    const content=document.getElementById('pageContent');

    if(!content) return;


    document
      .querySelectorAll('.nav-item')
      .forEach(button=>{

        button.classList.toggle(
          'active',
          button.dataset.page===currentPage
        );

      });


    if(currentPage==='matches'){
      content.innerHTML=renderMatches();
      return;
    }


    if(currentPage==='accounts'){
      content.innerHTML=renderAccounts();
      return;
    }


    if(currentPage==='more'){
      content.innerHTML=renderMore();
      bindMore();
      return;
    }


    content.innerHTML=renderHome();
  }



  /* =========================
     ACCUEIL
     ========================= */

  function renderHome(){

    const {
      matches,
      tickets,
      remaining,
      attMap
    }=appData;

    const firstName=(profile?.name||'Supporter').trim().split(' ')[0];

    const visibleMatches=getVisibleMatches(matches,attMap);

    const nextMatch=visibleMatches[0]||null;


    return `

     <section class="home-hero">

  <div class="home-welcome">

    <h1>
      Bonjour ${esc(firstName)} 👋
    </h1>

    <p>
      Bienvenue sur ton espace Verts !
    </p>

  </div>

</section>


     <section class="home-next-match">

  <div class="home-section-title">
    <h2>Prochain match</h2>
    <span>Ligue 2 BKT</span>
  </div>

  ${
    nextMatch
    ? renderHomeMatch(nextMatch)
    : `
      <div class="empty-state">
        Aucun prochain match pour le moment.
      </div>
    `
  }

</section>


      <section class="balance-card">

        <div>
          <div class="section-eyebrow">
            MON SOLDE
          </div>

          <div class="home-money">
            ${fmt(remaining)}
          </div>

          <div class="small">
            Reste à payer
          </div>
        </div>

        <button
          class="mini-action"
          onclick="changePage('accounts')"
        >
          Voir mes comptes →
        </button>

      </section>


   
    `;
  }



  /* =========================
     MATCHS
     ========================= */

  function getVisibleMatches(matches,attMap){

    return matches.filter(m=>{

      const deadline=m.ticketing_opens_at
        ? new Date(m.ticketing_opens_at)
        : null;

      const matchDate=m.match_starts_at
        ? new Date(m.match_starts_at)
        : (
            m.date
            ? new Date(m.date+'T23:59:59')
            : null
          );

      const expired=
        (deadline&&new Date()>=deadline)
        ||
        (matchDate&&new Date()>=matchDate);


      return !expired||attMap[m.id]==='yes';
    });
  }



  function renderMatches(){

    const {matches,attMap}=appData;

    const visibleMatches=getVisibleMatches(
      matches,
      attMap
    );


    return `

      <section class="page-heading">

        <div class="section-eyebrow">
          SAISON EN COURS
        </div>

        <h1>Mes matchs</h1>

        <p>
          Indique ta présence et retrouve l’état de tes billets.
        </p>

      </section>


      <section class="section-block">

        ${
          visibleMatches.length
          ? visibleMatches
              .map(m=>renderMatchCard(m,false))
              .join('')
          : `
            <div class="empty-state">
              Aucun match ouvert pour le moment.
            </div>
          `
        }

      </section>
    `;
  }

function getTeamLogo(teamName){

  const name=(teamName||'').toLowerCase();

  const logos={
    'clermont':'logos/clermont-foot.webp',
    'grenoble':'logos/logo-grenoble.webp',
    'montpellier':'logos/logo-montpellier.webp',
    'rodez':'logos/rodez-logo.webp',
    'nantes':'logos/Nantes-logo.webp',
    'laval':'logos/logo-stade-lavallois.webp',
    'nancy':'logos/logo-as-nancy.webp',
    'boulogne':'logos/logo-boulogne.webp',
    'dunkerque':'logos/logo-Dunkerque.webp',
    'metz':'logos/fc-metz-logo.webp',
    'sochaux':'logos/sochaux-logo.webp',
    'guingamp':'logos/guingamp-logo.webp',
    'red star':'logos/Red-Star-FC-logo.webp',
    'annecy':'logos/Logo-Annecy-foot.webp',
    'dijon':'logos/dijon-logo.webp',
    'reims':'logos/Stade-de-Reims-logo.webp',
    'pau':'logos/logo-pau.webp'
  };

  for(const key in logos){
    if(name.includes(key)){
      return logos[key];
    }
  }

  return '';
}

  function renderHomeMatch(m){

  if(!m){
    return `
      <div class="empty-state">
        Aucun prochain match pour le moment.
      </div>
    `;
  }

  const opponent=m.opponent||'Adversaire';
  const opponentLogo=getTeamLogo(opponent);

  const matchDate=m.match_starts_at
    ? new Date(m.match_starts_at)
    : (m.date ? new Date(m.date+'T12:00:00') : null);

  const dateLabel=matchDate
    ? matchDate.toLocaleDateString(
        'fr-FR',
        {
          weekday:'long',
          day:'numeric',
          month:'long',
          year:'numeric'
        }
      )
    : '';

  const timeLabel=m.match_starts_at
    ? matchDate.toLocaleTimeString(
        'fr-FR',
        {
          hour:'2-digit',
          minute:'2-digit'
        }
      )
    : '';

  const place=m.venue||m.stadium||'Stade Geoffroy-Guichard';

  return `

    <div class="home-match-card">

      <div class="home-match-competition">
        ${esc(m.competition||'Ligue 2 BKT')}
      </div>

      <div class="home-match-teams">

        <div class="home-team">
          <img
            src="logos/LogoASSE.webp"
            alt="ASSE"
            class="home-team-logo"
          >
          <strong>ASSE</strong>
          <span>Saint-Étienne</span>
        </div>

        <div class="home-match-center">

          <strong class="home-match-date">
            ${esc(dateLabel)}
          </strong>

          ${
            timeLabel
            ? `
              <div class="home-match-time">
                ${esc(timeLabel)}
              </div>
            `
            : ''
          }

          <div class="home-match-place">
            🏟️ ${esc(place)}
          </div>

        </div>

        <div class="home-team">

          ${
            opponentLogo
            ? `
              <img
                src="${esc(opponentLogo)}"
                alt="${esc(opponent)}"
                class="home-team-logo"
              >
            `
            : ''
          }

          <strong>${esc(opponent)}</strong>

        </div>

      </div>

      <button
        class="home-match-button"
        onclick="changePage('matches')"
      >
        🎟️ Voir le match
        <span>›</span>
      </button>

    </div>

  `;
}
  
  function renderMatchCard(m,compact=false){

    const {tickets,attMap}=appData;


    const deadline=m.ticketing_opens_at
      ? new Date(m.ticketing_opens_at)
      : null;


    const expired=
      deadline&&new Date()>=deadline;


    const ticket=tickets.find(
      t=>t.match_id===m.id
    );


    const matchDate=m.match_starts_at
      ? new Date(m.match_starts_at)
          .toLocaleString(
            'fr-FR',
            {
              dateStyle:'short',
              timeStyle:'short'
            }
          )
      : m.date||'';


    return `

      <article class="match-card ${compact?'compact':''}">

        <div class="match-top">

          <span class="match-badge">
            MATCH
          </span>

          ${
            attMap[m.id]==='yes'
            ? `<span class="answer-badge yes-answer">Présent</span>`
            : attMap[m.id]==='no'
            ? `<span class="answer-badge no-answer">Absent</span>`
            : ''
          }

        </div>


        <h3>
          ${esc(m.name)}
        </h3>


        <div class="match-info">
          <div>📅 ${esc(matchDate)}</div>

          <div>
            📍 ${esc(
              m.venue||
              m.stadium||
              'Stade non renseigné'
            )}
          </div>

          ${
            m.opponent
            ? `<div>⚽ ${esc(m.opponent)}</div>`
            : ''
          }

        </div>


        ${
          !expired
          ? `

            <div class="actions">

              <button
                class="btn yes ${attMap[m.id]==='yes'?'selected':''}"
                onclick="answer('${m.id}','yes')"
              >
                ✓ Je veux y aller
              </button>


              <button
                class="btn no ${attMap[m.id]==='no'?'selected':''}"
                onclick="answer('${m.id}','no')"
              >
                Je ne peux pas
              </button>

            </div>


            ${
              deadline
              ? `
                <div class="deadline">
                  Réponse jusqu'au
                  ${deadline.toLocaleString(
                    'fr-FR',
                    {
                      dateStyle:'short',
                      timeStyle:'short'
                    }
                  )}
                </div>
              `
              : ''
            }

          `
          : ticket
          ? `
            <div class="ticket-status success">
              <strong>✓ Billet pris</strong>
              <span>
                ${esc(ticket.tribune||'Tribune non renseignée')}
                ·
                ${fmt(ticket.price)}
              </span>
            </div>
          `
          : `
            <div class="ticket-status waiting">
              <strong>⏳ Billet en attente</strong>
              <span>
                Ta demande a bien été prise en compte.
              </span>
            </div>
          `
        }

      </article>
    `;
  }



  /* =========================
     COMPTES
     ========================= */

  window.filterHistory=function(type,button){

  document
    .querySelectorAll('.history-tab')
    .forEach(tab=>tab.classList.remove('active'));

  button.classList.add('active');

  document
    .querySelectorAll('.account-history-list .history-card')
    .forEach(card=>{

      if(type==='all' || card.dataset.type===type){
        card.style.display='flex';
      }else{
        card.style.display='none';
      }

    });

};
  
  function renderAccounts(){

  const {
    tickets,
    pays,
    ticketTotal,
    paid
  }=appData;

  const totalDue=ticketTotal;
  const balance=totalDue-paid;

  let balanceLabel='Compte à jour';
  let balanceClass='is-ok';
  let balanceAmount=fmt(0);

  if(balance>0){
    balanceLabel='À régler';
    balanceClass='is-due';
    balanceAmount=fmt(balance);
  }else if(balance<0){
    balanceLabel='À rembourser';
    balanceClass='is-refund';
    balanceAmount=fmt(Math.abs(balance));
  }

  const history=[
    ...tickets.map(t=>({
      type:'ticket',
      icon:'🎟️',
      title:t.match||'Billet de match',
      detail:t.tribune||'Tribune à confirmer',
      date:t.date||'',
      amount:Number(t.price||0)
    })),

    ...pays.map(p=>({
      type:'payment',
      icon:'€',
      title:p.note||'Paiement',
      detail:'Paiement enregistré',
      date:p.date||'',
      amount:-Number(p.amount||0)
    }))
  ].sort((a,b)=>
    String(b.date||'').localeCompare(String(a.date||''))
  );

  return `

    <section class="accounts-heading">

      <div>
        <div class="section-eyebrow">
          MON ESPACE FINANCIER
        </div>

        <h1>Mes comptes</h1>

        <p>
          Retrouve simplement tes billets, tes paiements
          et ton solde actuel.
        </p>
      </div>

    </section>


    <section class="account-balance-card ${balanceClass}">

      <div class="account-balance-label">
        Mon solde actuel
      </div>

      <div class="account-balance-amount">
        ${balanceAmount}
      </div>

      <div class="account-balance-status">
        ${balanceLabel}
      </div>

    </section>


    <section class="account-detail-card">

      <div class="account-detail-title">
        Détail de mon compte
      </div>


      <div class="account-detail-row">
        <span>Total des billets</span>
        <strong>${fmt(ticketTotal)}</strong>
      </div>



      <div class="account-detail-row account-detail-total">
        <span>Total à payer</span>
        <strong>${fmt(totalDue)}</strong>
      </div>


      <div class="account-detail-row account-payment-row">
        <span>Total des paiements</span>
        <strong>${fmt(paid)}</strong>
      </div>



      <div class="account-detail-row account-final-row ${balanceClass}">
        <span>
          ${
            balance>0
            ? 'Solde restant'
            : balance<0
            ? 'À me rembourser'
            : 'Solde restant'
          }
        </span>

        <strong>${balanceAmount}</strong>
      </div>

    </section>


    <section class="account-history-section">

      <div class="account-history-heading">

        <div>
          <div class="section-eyebrow">
            MES OPÉRATIONS
          </div>

          <h2>Historique</h2>
        </div>

        <span class="history-count">
          ${history.length}
        </span>

      </div>


   <div class="history-tabs">
  <button
    class="history-tab active"
    onclick="filterHistory('all',this)"
  >
    Tous
  </button>

  <button
    class="history-tab"
    onclick="filterHistory('ticket',this)"
  >
    Billets
  </button>

  <button
    class="history-tab"
    onclick="filterHistory('payment',this)"
  >
    Paiements
  </button>
</div>


      <div class="account-history-list">

        ${
          history.length
          ? history.map(item=>`

             <article class="history-card" data-type="${item.type}">

                <div class="history-icon ${item.type}">
                  ${item.icon}
                </div>

                <div class="history-content">

                  <strong>
                    ${esc(item.title)}
                  </strong>

                  <span>
                    ${esc(item.detail)}
                  </span>

                  ${
                    item.date
                    ? `<small>${esc(item.date)}</small>`
                    : ''
                  }

                </div>

                <div class="history-amount ${item.amount<0?'payment':''}">
                  ${
                    item.amount<0
                    ? '- '+fmt(Math.abs(item.amount))
                    : '+ '+fmt(item.amount)
                  }
                </div>

              </article>

            `).join('')
          : `
              <div class="empty-state">
                Aucune opération enregistrée pour le moment.
              </div>
            `
        }

      </div>

    </section>

  `;
}


  /* =========================
     PLUS
     ========================= */

  function renderMore(){

    return `

      <section class="page-heading">

        <div class="section-eyebrow">
          MON ESPACE
        </div>

        <h1>Plus</h1>

      </section>


      <section class="profile-card">

        <div class="profile-avatar">
          ${esc(
            (profile.name||'?')
              .charAt(0)
              .toUpperCase()
          )}
        </div>

        <div>

          <strong>
            ${esc(profile.name)}
          </strong>

          <span>
            ${esc(profile.email||'')}
          </span>

        </div>

      </section>


      <section class="more-list">

        <button
          class="more-row"
          onclick="changePage('matches')"
        >
          <span>⚽ Mes matchs</span>
          <b>›</b>
        </button>


        <button
          class="more-row"
          onclick="changePage('accounts')"
        >
          <span>🎟️ Mes billets et comptes</span>
          <b>›</b>
        </button>


        <button
          id="refreshData"
          class="more-row"
        >
          <span>↻ Actualiser mes données</span>
          <b>›</b>
        </button>


        <button
          id="logout"
          class="more-row logout-row"
        >
          <span>Déconnexion</span>
          <b>›</b>
        </button>

      </section>
    `;
  }



  function bindMore(){

    const refresh=document.getElementById('refreshData');

    if(refresh){

      refresh.onclick=async()=>{
        await loadData();
      };
    }


    const logout=document.getElementById('logout');

    if(logout){

      logout.onclick=async()=>{

        await sb.auth.signOut();

        profile=null;
        appData=null;
        currentPage='home';

        login();
      };
    }
  }



  /* =========================
     RÉPONSES AUX MATCHS
     ========================= */

  window.answer=async(matchId,answer)=>{

    const r=await sb
      .from('match_attendance')
      .upsert(
        {
          match_id:matchId,
          supporter_id:profile.id,
          answer,
          updated_at:new Date().toISOString()
        },
        {
          onConflict:'match_id,supporter_id'
        }
      );


    if(r.error){

      alert(
        'Impossible d’enregistrer la réponse : '
        +r.error.message
      );

      return;
    }


    await loadData();
  };



  /* =========================
     SESSION
     ========================= */

  sb.auth.onAuthStateChange(
    (event,session)=>{

      if(
        event==='SIGNED_IN'
        &&
        session
      ){
        setTimeout(loadProfile,0);
      }

    }
  );


  boot();

})();



if('serviceWorker' in navigator){

  navigator
    .serviceWorker
    .register('./sw.js')
    .catch(()=>{});

}
