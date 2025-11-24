Instruções para rodar o backend (desenvolvimento local)

Este repositório contém um servidor Node/Express simples para armazenar e expor as denúncias e lista de administradores em `js/reports.json` e `js/admins.json`.

1) Instalar dependências (PowerShell):

```powershell
cd "c:\Caminho\para\Site de venda de produtos"
npm install
```

2) Iniciar servidor:

```powershell
# LojaNatural — Instruções de desenvolvimento

Este repositório contém um site simples de loja com um servidor Node/Express leve para persistência local (arquivos JSON) e funcionalidades administrativas para desenvolvimento local.

Siga os passos abaixo para configurar o ambiente no Windows (PowerShell) e executar o site em HTTP ou em HTTPS local.

## 1) Instalar Node.js
- Baixe e instale a versão LTS do Node.js em: https://nodejs.org/ (escolha o instalador para Windows).
- Após a instalação, abra o PowerShell e verifique:

```powershell
node -v
npm -v
```

Você deve ver as versões instaladas.

## 2) Instalar dependências do projeto
No PowerShell, navegue até a pasta do projeto (ex.: a pasta onde está este README) e rode:

```powershell
cd "c:\Users\<seu-usuario>\Documents\Códigos\Site de venda de produtos"
npm install
```

Isso instalará `express`, `bcryptjs`, `nodemailer` e outras dependências listadas em `package.json`.

## 3) Iniciar o servidor (HTTP)
Para desenvolvimento local simples (HTTP), rode:

```powershell
npm start
```

Por padrão o servidor escuta em `http://localhost:3000`.

### Observação
- O servidor serve os arquivos estáticos (HTML/CSS/JS) e endpoints API para persistência (arquivos JSON em `js/`).

## 4) Rodar em HTTPS local (recomendado para testar recursos que requerem HTTPS)
Para testar HTTPS localmente, recomendo usar `mkcert` (fábrica de certificados local confiáveis). Alternativa é usar `http-server` com certificados autoassinados.

Opção A — Usando `mkcert` (recomendado):
1. Baixe e instale `mkcert` para Windows: https://github.com/FiloSottile/mkcert#installation
	- Existe instalador para Windows; siga as instruções da página.
2. No PowerShell (não precisa ser administrador para os comandos abaixo na maioria dos casos), gere certificados para `localhost`:

```powershell
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

Isso criará dois arquivos com nome parecido com `localhost+2.pem` e `localhost+2-key.pem` no diretório atual.

3. Testar um servidor estático HTTPS (ferramenta rápida):

```powershell
npx http-server -S -C .\localhost+2.pem -K .\localhost+2-key.pem -p 3443
```

Abra `https://localhost:3443` no navegador.

Opção B — Usar HTTPS com o `server.js` (Express):
- Se preferir que o `server.js` sirva via HTTPS, você precisa alterar `server.js` para criar um servidor HTTPS com `https.createServer({ key, cert }, app).listen(3443)` e apontar `key` e `cert` para os arquivos gerados por `mkcert`.
- Exemplo de comando (PowerShell) para rodar com variáveis de ambiente apontando para as chaves:

```powershell
$env:SSL_KEY="C:\caminho\para\localhost+2-key.pem"; $env:SSL_CERT="C:\caminho\para\localhost+2.pem"; npm start
```

(Observe que o `server.js` padrão deste repositório não cria servidor HTTPS automaticamente — é uma alteração de código se quiser fazer isso.)

## 5) Configurar envio de e-mail (contato)
O endpoint `/api/contact` tentará enviar email via SMTP apenas se variáveis de ambiente estiverem configuradas; caso contrário, grava a mensagem em `js/contact_messages.json` como fallback.

Variáveis (exemplo no PowerShell):

```powershell
$env:SMTP_HOST = 'smtp.example.com'
$env:SMTP_PORT = '587'
$env:SMTP_USER = 'user@example.com'
$env:SMTP_PASS = 'sua-senha'
$env:STORE_EMAIL = 'loja@seudominio.com'  # opcional; por padrão usa SMTP_USER
npm start
```

- Se preferir usar serviços como Gmail, verifique as configurações e as permissões (senhas de app/2FA conforme necessário).
- Se as variáveis de ambiente não existirem, as mensagens do formulário de contato serão guardadas localmente em `js/contact_messages.json`.

## 6) O que foi implementado
- Endpoint `/api/contact` para receber mensagens de contato (a página `contact.html` foi removida). O endpoint envia por SMTP quando configurado e grava em `js/contact_messages.json` como fallback.
- Se SMTP estiver configurado via variáveis de ambiente, o servidor usará `nodemailer` para enviar o e-mail.
- Se não estiver, as mensagens vão para `js/contact_messages.json`.
- A página `shop.html` agora tem filtros (categoria, preço, ordenação) que filtram os produtos exibidos.
- O fluxo de registro/login foi atualizado para evitar salvar senhas em texto plano no `localStorage` se o registro ocorreu com sucesso no servidor. Senhas são hasheadas no servidor com `bcryptjs`.

## 7) Observações de segurança e práticas recomendadas
- Nunca commit credenciais (senhas, chaves privadas, tokens) no repositório.
- Em produção, não use validação baseada somente em cabeçalhos (`x-admin-email`) — use autenticação adequada (JWT, sessions com cookies httpOnly, etc.).
- O servidor atual é destinado apenas a desenvolvimento local. Para produção, troque o armazenamento em arquivos por um banco de dados e implemente autenticação/autorizações robustas.

## 8) Sobre cookies e consentimento
- Cookies: adicionar cookies é útil para manter sessões (login persistente) ou preferências do usuário. Para um pequeno e-commerce local, você pode usar cookies HTTP apenas para sessão (httpOnly, Secure) e armazenar dados não sensíveis no `localStorage` se preferir, mas seja cuidadoso.
- Consentimento: dependendo da sua jurisdição, é recomendável informar os usuários sobre o uso de cookies e coletar consentimento quando cookies não essenciais (rastreadores, análises) forem usados. Para um site pequeno que apenas mantém sessão, uma notificação simples explicando o uso de cookies pode ser suficiente.

## 9) Campos no cadastro (Termos e Privacidade)
- Sim — adicione checkbox(es) no formulário de cadastro para que o usuário concorde com os `Termos de Uso` e `Política de Privacidade` antes de criar a conta. Exemplo:

```html
<label><input type="checkbox" name="agreeTerms" required> Eu li e concordo com os <a href="terms.html">Termos de Uso</a> e a <a href="privacy.html">Política de Privacidade</a></label>
```

- Isso ajuda a proteger legalmente sua loja e informar clientes sobre tratamento de dados.

## 10) Testes rápidos
- Registrar um usuário: abra `register.html`, crie conta (servidor rodando) e verifique `js/users.json` (hash de senha salvo pelo servidor).
- Fazer login: abra `login.html` e autentique; `localStorage.currentUser` deve ser preenchido sem campo `password`.
- Testar contato: enviar uma requisição POST para `/api/contact` com JSON { name, email, message } (pode usar `curl` ou Postman). Se SMTP configurado, verifique a caixa de entrada; se não, verifique `js/contact_messages.json`.
- Testar filtros: abra `shop.html` e use os controles de categoria/preço/ordenar.

---
Se quiser, eu posso:
- Alterar `server.js` para que ele crie um servidor HTTPS diretamente a partir dos arquivos `cert`/`key` (faço o patch e mostro como executar), ou
- Implementar sessão com cookies httpOnly (próximo passo para produção), ou
- Gerar um exemplo de `docker-compose` para rodar tudo isolado.

Diga qual desses próximos passos prefere e eu continuo.
