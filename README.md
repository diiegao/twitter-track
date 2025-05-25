
# Twitter/X Tracker com Scraping

Este projeto monitora perfis públicos do Twitter/X para:

✅ Detectar novos Tweets e Respostas (Replies)  
✅ Notificar quando um perfil **seguir ou deixar de seguir** alguém  
✅ Registrar o **horário exato** de cada ação  
✅ Enviar **notificações via Telegram**

---

## 📦 Requisitos

- Node.js 18+  
- Telegram Bot Token e Chat ID  
- PM2 (opcional, para rodar 24/7)
- Puppeteer

---

## 📂 Estrutura dos arquivos

- `index.js` → Código principal
- `profiles.json` → Lista de perfis para monitorar
- `lastTweets.json` → Histórico de tweets
- `lastFollows.json` → Histórico de follows
- `cookies.json` → Cookies da sessão logada (criado por você)
- `.env` → Chaves do Telegram
- `saveCookies.js` → Script para login e geração do cookies.json

---

## ⚙️ Como rodar

1. Instale dependências:

```bash
npm install puppeteer node-telegram-bot-api dotenv
```

2. Gere `cookies.json` com o script de login:

```bash
node saveCookies.js
```

3. Edite `.env` com seu token e chat ID:

```env
TELEGRAM_BOT_TOKEN=seu_token
TELEGRAM_CHAT_ID=seu_chat_id
```

4. Adicione os perfis desejados no `profiles.json`.

5. Inicie o monitoramento:

```bash
node index.js
```

6. (Opcional) Rode 24/7 com PM2:

```bash
npm install -g pm2
pm2 start index.js --name twitter-tracker
pm2 save
pm2 startup
```

---
