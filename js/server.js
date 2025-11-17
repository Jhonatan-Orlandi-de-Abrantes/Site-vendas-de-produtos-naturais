// ======================================================
//  CONFIGURAÇÃO DO SERVIDOR
// ======================================================
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json());

//  🔧 CONFIGURAÇÕES DO BACKEND

// 🔧 Alterar quando for subir no servidor real
const JWT_SECRET = "trocar_por_uma_chave_forte"; 

// 🔧 URL do MongoDB (banco real do cliente)
const MONGO_URL = "mongodb://127.0.0.1:27017/ecommerce";  

mongoose.connect(MONGO_URL)
.then(() => console.log("MongoDB conectado 🚀"))
.catch(err => console.error("Erro ao conectar:", err));

//  🔧 MODELO DO USUÁRIO (MongoDB Schema)
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  address: String,
  avatar: { type: String, default: "images/team1.jpg" }
});

const User = mongoose.model("User", UserSchema);

//  FUNÇÕES DE AUTENTICAÇÃO

function generateToken(user){
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if(!header) return res.status(403).json({ error: "Token faltando" });

  const token = header.split(" ")[1];
  try{
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
  } catch (err){
      return res.status(401).json({ error: "Token inválido" });
  }
}

//  ROTAS PÚBLICAS

// Registro
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, address } = req.body;

  // 🔧 BACKEND: Validação real pode ser adicionada depois
  if(!email || !password) return res.status(400).json({ error: "Dados incompletos" });

  const exists = await User.findOne({ email });
  if(exists) return res.status(409).json({ error: "Email já existe" });

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({ name, email, password: hash, address });
  
  return res.json({ message: "Usuário criado", user: { name, email, address } });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if(!user) return res.status(404).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(password, user.password);
  if(!valid) return res.status(401).json({ error: "Senha incorreta" });

  const token = generateToken(user);

  return res.json({
    message: "Logado com sucesso",
    token,
    user: { name: user.name, email: user.email, address: user.address, avatar: user.avatar }
  });
});


//  ROTAS PROTEGIDAS (necessitam login via token JWT)

// Perfil do usuário logado
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json(user);
});

// Logout (apenas front-end remove token, aqui é simbólico)
app.post("/api/auth/logout", (req, res) => {
  return res.json({ message: "Logout efetuado" });
});

//  INICIALIZAÇÃO DO SERVIDOR
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
