const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = './data.json';
function loadData(){
  if(!fs.existsSync(DATA_FILE)){
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      owner: { username: 'Nova12', password: 'Nova' },
      botToken: '',
      autoActivate: true,
      users: []
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'tele-web-bug-secret-please-change',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static('public'));

// Helper middleware
function requireOwner(req, res, next){
  const data = loadData();
  if(req.session && req.session.owner === data.owner.username) return next();
  return res.status(401).json({ ok:false, error:'owner auth required' });
}
function requireUser(req, res, next){
  if(req.session && req.session.userId){
    const data = loadData();
    const u = data.users.find(x=> x.id === req.session.userId);
    if(u && u.active) return next();
  }
  return res.status(401).json({ ok:false, error:'user auth required or inactive' });
}

// Owner login
app.post('/owner/login', (req,res)=>{
  const { username, password } = req.body;
  const data = loadData();
  if(username === data.owner.username && password === data.owner.password){
    req.session.owner = username;
    return res.json({ ok:true });
  }
  return res.json({ ok:false, error:'invalid owner credentials' });
});

// Owner logout
app.post('/owner/logout', (req,res)=>{
  req.session.owner = null;
  res.json({ ok:true });
});

// Owner set bot token (saved)
app.post('/owner/set-token', requireOwner, (req,res)=>{
  const { token } = req.body;
  const data = loadData();
  data.botToken = token || '';
  saveData(data);
  res.json({ ok:true });
});

// Owner set auto activate flag
app.post('/owner/set-auto', requireOwner, (req,res)=>{
  const { auto } = req.body;
  const data = loadData();
  data.autoActivate = !!auto;
  saveData(data);
  res.json({ ok:true, auto: data.autoActivate });
});

// Owner create user (API still available but UI create removed)
app.post('/owner/create-user', requireOwner, (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.json({ ok:false, error:'missing fields' });
  const data = loadData();
  if(data.users.find(u=>u.username === username)) return res.json({ ok:false, error:'username exists' });
  const user = { username, password, active: !!data.autoActivate, id: uuidv4() };
  data.users.push(user);
  saveData(data);
  res.json({ ok:true, user: { username: user.username, active: user.active }});
});

// Owner list users
app.get('/owner/users', requireOwner, (req,res)=>{
  const data = loadData();
  res.json({ ok:true, users: data.users.map(u=>({ username:u.username, active:u.active, id:u.id }))});
});

// Owner send using stored token
app.post('/owner/send', requireOwner, async (req,res)=>{
  const { chat_id, text } = req.body;
  const data = loadData();
  const token = data.botToken;
  if(!token) return res.json({ ok:false, error:'bot token not set' });
  if(!chat_id || !text) return res.json({ ok:false, error:'missing chat_id or text' });

  try{
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id, text })
    });
    const json = await resp.json();
    if(json.ok) return res.json({ ok:true, result: json.result });
    return res.json({ ok:false, error: json });
  }catch(err){
    return res.json({ ok:false, error: err.message });
  }
});

// User login (existing accounts created by owner via API)
app.post('/login', (req,res)=>{
  const { username, password } = req.body;
  const data = loadData();
  const user = data.users.find(u => u.username === username && u.password === password);
  if(!user) return res.json({ ok:false, error:'invalid credentials' });
  if(!user.active) return res.json({ ok:false, error:'account not active' });
  req.session.userId = user.id;
  res.json({ ok:true, username: user.username });
});

// User logout
app.post('/logout', (req,res)=>{
  req.session.userId = null;
  res.json({ ok:true });
});

/*
  USER SEND:
  - Accepts body: { chat_id, text, token? }
  - If token provided by user client, use it.
  - Else fallback to owner-saved botToken (if set).
*/
app.post('/user/send', requireUser, async (req,res)=>{
  const { chat_id, text, token } = req.body;
  const data = loadData();
  const usedToken = (token && token.trim()) ? token.trim() : data.botToken;
  if(!usedToken) return res.json({ ok:false, error:'no bot token provided (user must provide token or owner must set token)' });
  if(!chat_id || !text) return res.json({ ok:false, error:'missing chat_id or text' });

  try{
    const resp = await fetch(`https://api.telegram.org/bot${usedToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id, text })
    });
    const json = await resp.json();
    if(json.ok) return res.json({ ok:true, result: json.result });
    return res.json({ ok:false, error: json });
  }catch(err){
    return res.json({ ok:false, error: err.message });
  }
});

const PORT = process.env.PORT || 2540;
app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));