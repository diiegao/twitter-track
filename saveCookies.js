
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // abre o navegador visível
  const page = await browser.newPage();

  console.log("🔐 Acesse https://twitter.com/login para entrar com sua conta...");
  await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

  // Aguarda você logar manualmente (até 2 minutos)
  await new Promise(resolve => {
    console.log("⏳ Você tem até 2 minutos para fazer login...");
    setTimeout(resolve, 120000); // 2 minutos
  });

  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

  console.log('✅ Cookies salvos com sucesso em cookies.json');
  await browser.close();
})();
