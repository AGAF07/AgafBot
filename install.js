#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando instalação do AgafBot...');

// Criar diretórios necessários
const diretoriosNecessarios = [
  './database',
  './public/uploads',
  './public/img'
];

diretoriosNecessarios.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Criando diretório: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Verificar se o banco de dados já existe
const dbPath = path.join('./database', 'agafbot.db');
if (!fs.existsSync(dbPath)) {
  console.log('Criando e inicializando banco de dados...');
  
  try {
    // Executando o script de inicialização do banco de dados
    require('./database/init-db');
    console.log('Banco de dados criado e inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
    process.exit(1);
  }
} else {
  console.log('Banco de dados já existe.');
}

// Criar imagens placeholder se não existirem
const imagensPlaceholder = [
  { caminho: './public/img/paypal.png', mensagem: 'Logo PayPal' },
  { caminho: './public/img/redotpay.png', mensagem: 'Logo RedotPay' },
  { caminho: './public/img/bybit.png', mensagem: 'Logo Bybit' }
];

imagensPlaceholder.forEach(img => {
  if (!fs.existsSync(img.caminho)) {
    console.log(`Criando imagem placeholder: ${img.caminho}`);
    // Criar um arquivo de imagem placeholder básico
    const dadosImagem = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    fs.writeFileSync(img.caminho, dadosImagem);
  }
});

console.log('Instalação concluída com sucesso!');
console.log('Para iniciar o AgafBot, execute o arquivo principal.');
console.log('Acesse o painel web em http://localhost:3000'); 