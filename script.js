document.addEventListener('DOMContentLoaded', ()=>{
  const hamb = document.getElementById('hamb');
  const menuBox = document.getElementById('menuBox');
  hamb.addEventListener('click', ()=> menuBox.classList.toggle('hidden'));

  // owner modal
  const ownerModal = document.getElementById('ownerModal');
  document.getElementById('ownerLoginBtn').addEventListener('click', ()=> ownerModal.classList.remove('hidden'));
  document.getElementById('ownerClose').addEventListener('click', ()=> ownerModal.classList.add('hidden'));
  document.getElementById('ownerLoginSubmit').addEventListener('click', async ()=>{
    const user = document.getElementById('ownerUser').value;
    const pass = document.getElementById('ownerPass').value;
    const r = await fetch('/owner/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:user,password:pass})});
    const j = await r.json();
    alert(j.ok ? 'Owner logged in' : ('Error: '+(j.error||'failed')));
    if(j.ok){
      ownerModal.classList.add('hidden');
      document.getElementById('ownerControls').classList.remove('hidden');
      document.getElementById('ownerLogoutBtn').classList.remove('hidden');
    }
  });

  // user login modal (NEW)
  const userModal = document.getElementById('userModal');
  document.getElementById('userLoginBtn').addEventListener('click', ()=> userModal.classList.remove('hidden'));
  document.getElementById('userClose').addEventListener('click', ()=> userModal.classList.add('hidden'));
  document.getElementById('userLoginSubmit').addEventListener('click', async ()=>{
    const username = document.getElementById('userUser').value;
    const password = document.getElementById('userPass').value;
    const r = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password })});
    const j = await r.json();
    document.getElementById('userStatus').innerText = j.ok ? `Logged in as ${j.username}` : `Error: ${j.error||'failed'}`;
    if(j.ok){
      userModal.classList.add('hidden');
      // show a small indicator that user is logged in (we'll show ownerControls area as not relevant)
      document.getElementById('status').innerText = `User logged in: ${j.username}`;
    }
  });

  // list users (owner only)
  document.getElementById('ownerUsersBtn').addEventListener('click', async ()=>{
    const r = await fetch('/owner/users');
    const j = await r.json();
    if(!j.ok){ alert('owner auth required'); return; }
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    j.users.forEach(u=>{
      const div = document.createElement('div');
      div.className = 'users-list-item';
      div.innerText = `${u.username} — active: ${u.active}`;
      usersList.appendChild(div);
    });
    document.getElementById('usersModal').classList.remove('hidden');
  });
  document.getElementById('closeUsers').addEventListener('click', ()=> document.getElementById('usersModal').classList.add('hidden'));

  // save token (owner)
  document.getElementById('saveToken').addEventListener('click', async ()=>{
    const token = document.getElementById('botToken').value.trim();
    const r = await fetch('/owner/set-token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token })});
    const j = await r.json();
    alert(j.ok ? 'Token saved' : 'Error');
  });

  // toggle auto
  document.getElementById('toggleAuto').addEventListener('click', async ()=>{
    const r = await fetch('/owner/set-auto', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ auto: true })});
    const j = await r.json();
    alert(j.ok ? 'Auto Activate is now: '+j.auto : 'Error');
  });

  // owner logout
  document.getElementById('ownerLogoutBtn').addEventListener('click', async ()=>{
    await fetch('/owner/logout', { method:'POST' });
    document.getElementById('ownerControls').classList.add('hidden');
    document.getElementById('ownerLogoutBtn').classList.add('hidden');
    alert('Owner logged out');
  });

  // send as owner: uses owner-saved token on server
  document.getElementById('sendAsOwner').addEventListener('click', async ()=>{
    const chat_id = document.getElementById('chatId').value.trim();
    const text = document.getElementById('msgText').value.trim();
    const r = await fetch('/owner/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chat_id, text })});
    const j = await r.json();
    document.getElementById('status').innerText = j.ok ? 'Sent ✅ (owner token)' : 'Error: '+(j.error?JSON.stringify(j.error):'failed');
  });

  // send as logged-in user: uses token from tokenInput if provided, else fallback to owner-saved token on server
  document.getElementById('sendAsUser').addEventListener('click', async ()=>{
    const chat_id = document.getElementById('chatId').value.trim();
    const text = document.getElementById('msgText').value.trim();
    const token = document.getElementById('tokenInput').value.trim();
    const payload = { chat_id, text };
    if(token) payload.token = token;
    const r = await fetch('/user/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    const j = await r.json();
    document.getElementById('status').innerText = j.ok ? 'Sent by user ✅' : 'Error: '+(j.error?JSON.stringify(j.error):'failed');
  });

});