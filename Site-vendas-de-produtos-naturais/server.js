const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PUBLIC_DIR = path.join(__dirname);
const JS_DIR = path.join(PUBLIC_DIR, 'js');
const REPORTS_FILE = path.join(JS_DIR, 'reports.json');
const ADMINS_FILE = path.join(JS_DIR, 'admins.json');
const LOGINS_FILE = path.join(JS_DIR, 'logins.json');
const DELETIONS_FILE = path.join(JS_DIR, 'deletions.json');
const USERS_FILE = path.join(JS_DIR, 'users.json');
const CONTACTS_FILE = path.join(JS_DIR, 'contact_messages.json');
const nodemailer = require('nodemailer');

function ensureFiles(){
  if(!fs.existsSync(JS_DIR)) fs.mkdirSync(JS_DIR);
  if(!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, '[]');
  if(!fs.existsSync(ADMINS_FILE)) fs.writeFileSync(ADMINS_FILE, JSON.stringify(["teste@gmail.com"], null, 2));
  if(!fs.existsSync(LOGINS_FILE)) fs.writeFileSync(LOGINS_FILE, '[]');
  if(!fs.existsSync(DELETIONS_FILE)) fs.writeFileSync(DELETIONS_FILE, '[]');
  if(!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
  if(!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]');
}
ensureFiles();

// Servir arquivos estáticos (site)
app.use(express.static(PUBLIC_DIR));

// Função simples para checar se email é admin
function isAdminEmail(email){
  try{
    const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8')) || [];
    // filtra emails válidos (ignora placeholders/strings inválidas)
    const validAdmins = admins.filter(a => typeof a === 'string' && a.includes('@'));
    return validAdmins.includes(email);
  } catch(e){
    return false;
  }
}

// Retorna lista de denúncias (somente admin)
app.get('/api/reports', (req, res) => {
  const adminEmail = req.header('x-admin-email');
  if(!adminEmail || !isAdminEmail(adminEmail)) return res.status(403).json({ error: 'forbidden' });
  const data = fs.readFileSync(REPORTS_FILE, 'utf8');
  return res.json(JSON.parse(data || '[]'));
});

// --- Endpoints para gerenciar usuários (simples, para desenvolvimento) ---

// Retorna lista de usuários (aberto)
app.get('/api/users', (req, res) => {
  try{
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return res.json(JSON.parse(data || '[]'));
  } catch(e){
    return res.status(500).json({ error: 'could not read users' });
  }
});

// Cria/registro de usuário (aberto)
app.post('/api/users', (req, res) => {
  try{
    const user = req.body; // espera { name, email, password, address, createdAt }
    if(!user || !user.email || !user.password) return res.status(400).json({ error: 'email and password required' });
    const curr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
    if(curr.find(u => u.email === user.email)) return res.status(409).json({ error: 'exists' });
    // gerar hash da senha antes de salvar
    const hash = bcrypt.hashSync(user.password, 10);
    const toSave = Object.assign({}, user);
    toSave.password = hash;
    curr.push(toSave);
    fs.writeFileSync(USERS_FILE, JSON.stringify(curr, null, 2));
    // retornar perfil sem senha
    const { password, ...profile } = toSave;
    return res.json({ ok: true, user: profile });
  } catch(e){
    return res.status(500).json({ error: 'could not save user' });
  }
});

// Endpoint de login que compara senha com hash (aberto)
app.post('/api/login', (req, res) => {
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    const curr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
    const user = curr.find(u => u.email === email);
    if(!user) return res.status(401).json({ error: 'invalid' });
    if(bcrypt.compareSync(password, user.password)){
      const { password, ...profile } = user;
      return res.json({ ok: true, user: profile });
    }
    return res.status(401).json({ error: 'invalid' });
  } catch(e){
    return res.status(500).json({ error: 'could not login' });
  }
});

// Atualiza usuário (aberto) - corpo completo do usuário esperado
app.put('/api/users', (req, res) => {
  try{
    const updated = req.body; // espera { email, ... }
    if(!updated || !updated.email) return res.status(400).json({ error: 'email required' });
    let curr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
    const idx = curr.findIndex(u => u.email === updated.email);
    if(idx === -1) return res.status(404).json({ error: 'not found' });
    curr[idx] = Object.assign({}, curr[idx], updated);
    fs.writeFileSync(USERS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not update user' });
  }
});

// Remove usuário (aberto) - por email
app.delete('/api/users/:email', (req, res) => {
  try{
    const email = req.params.email;
    let curr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
    const exists = curr.some(u => u.email === email);
    if(!exists) return res.status(404).json({ error: 'not found' });
    curr = curr.filter(u => u.email !== email);
    fs.writeFileSync(USERS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not delete user' });
  }
});


// Criar nova denúncia (aberto)
app.post('/api/reports', (req, res) => {
  try{
    const body = req.body;
    const curr = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8') || '[]');
    curr.push(body);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not save' });
  }
});

// Adicionar novo admin (aberto para desenvolvimento - em produção seria protegido)
app.post('/api/admins', (req, res) => {
  const adminEmail = req.header('x-admin-email');
  if(!adminEmail) return res.status(400).json({ error: 'x-admin-email header required' });
  const { email } = req.body;
  if(!email) return res.status(400).json({ error: 'email required' });
  try{
    let curr = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8') || '[]');
    // filtrar entradas inválidas (manter apenas emails válidos)
    curr = curr.filter(a => typeof a === 'string' && a.includes('@'));
    if(curr.includes(email)) return res.json({ ok:true, message: 'already' });
    curr.push(email);
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not add admin' });
  }
});

// Retornar admins (apenas admin)
app.get('/api/admins', (req, res) => {
  const adminEmail = req.header('x-admin-email');
  if(!adminEmail || !isAdminEmail(adminEmail)) return res.status(403).json({ error: 'forbidden' });
  const data = fs.readFileSync(ADMINS_FILE, 'utf8');
  return res.json(JSON.parse(data || '[]'));
});

// Remover admin (desenvolvimento) - requer header x-admin-email
app.delete('/api/admins/:email', (req, res) => {
  const adminEmail = req.header('x-admin-email');
  if(!adminEmail || !isAdminEmail(adminEmail)) return res.status(403).json({ error: 'forbidden' });
  const email = req.params.email;
  try{
    let curr = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8') || '[]');
    curr = curr.filter(a => typeof a === 'string' && a.includes('@') && a !== email);
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not remove admin' });
  }
});

// Remover/excluir denúncia - endpoint simples (apenas admin)
app.delete('/api/reports/:id', (req, res) => {
  const adminEmail = req.header('x-admin-email');
  if(!adminEmail || !isAdminEmail(adminEmail)) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  try{
    let curr = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8') || '[]');
    curr = curr.filter(r => r.id !== id);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not delete' });
  }
});

// Substituir lista inteira de denúncias (apenas admin)
app.put('/api/reports', (req, res) => {
  const adminEmail = req.header('x-admin-email');
  if(!adminEmail || !isAdminEmail(adminEmail)) return res.status(403).json({ error: 'forbidden' });
  const newList = req.body;
  if(!Array.isArray(newList)) return res.status(400).json({ error: 'array expected' });
  try{
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(newList, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not write' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));

// Registrar novo login (aberto)
app.post('/api/logins', (req, res) => {
  try{
    const body = req.body;
    // espera { name, email, address, createdAt }
    const curr = JSON.parse(fs.readFileSync(LOGINS_FILE, 'utf8') || '[]');
    curr.push(body);
    fs.writeFileSync(LOGINS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not save login' });
  }
});

// Registrar exclusão de conta (aberto) - grava no arquivo de deleções
app.post('/api/deletions', (req, res) => {
  try{
    const body = req.body; // espera { name, email, address, deletedAt }
    const curr = JSON.parse(fs.readFileSync(DELETIONS_FILE, 'utf8') || '[]');
    curr.push(body);
    fs.writeFileSync(DELETIONS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true });
  } catch(e){
    return res.status(500).json({ error: 'could not save deletion' });
  }
});

// Contato: envia email via SMTP se configurado, senão grava em arquivo de fallback
app.post('/api/contact', async (req, res) => {
  try{
    const { name, email, message } = req.body || {};
    if(!name || !email || !message) return res.status(400).json({ error: 'name,email,message required' });

    // Se variáveis de ambiente para SMTP estiverem presentes, tenta enviar
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const STORE_EMAIL = process.env.STORE_EMAIL || SMTP_USER;

    const record = { name, email, message, createdAt: new Date().toISOString() };

    if(SMTP_HOST && SMTP_USER && SMTP_PASS){
      // usar nodemailer
      const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT) || 587, secure: false, auth: { user: SMTP_USER, pass: SMTP_PASS } });
      const mailOptions = {
        from: SMTP_USER,
        to: STORE_EMAIL,
        subject: `Mensagem do site: ${name}`,
        text: `Remetente: ${name} <${email}>\n\n${message}`,
        html: `<p><strong>Remetente:</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g,'<br>')}</p>`
      };
      try{
        await transporter.sendMail(mailOptions);
        // opcional: também gravar no arquivo para histórico
        const curr = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8') || '[]');
        curr.push(Object.assign({}, record, { sentBy: 'smtp' }));
        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(curr, null, 2));
        return res.json({ ok: true });
      } catch(e){
        // se falhar no envio, cair para fallback de gravação
        console.warn('Erro ao enviar email via SMTP:', e && e.message);
      }
    }

    // fallback: gravar em arquivo
    const curr = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8') || '[]');
    curr.push(Object.assign({}, record, { sentBy: 'file' }));
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(curr, null, 2));
    return res.json({ ok: true, fallback: true });
  } catch(e){
    console.error('Erro /api/contact', e);
    return res.status(500).json({ error: 'could not process contact' });
  }
});
