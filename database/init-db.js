const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/agafbot.db');

// Criar as tabelas necessárias
db.serialize(() => {
  // Tabela de configurações
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Tabela de menus
  db.run(`
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      media_url TEXT,
      media_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela para respostas predefinidas
  db.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela para base de conhecimento
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      information TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserir configurações padrão se não existirem
  db.get('SELECT value FROM config WHERE key = "groq_api_key"', (err, row) => {
    if (!row) {
      db.run('INSERT INTO config (key, value) VALUES (?, ?)', ['groq_api_key', '']);
      console.log('Configuração padrão para API key criada');
    }
  });

  db.get('SELECT value FROM config WHERE key = "bot_language"', (err, row) => {
    if (!row) {
      db.run('INSERT INTO config (key, value) VALUES (?, ?)', ['bot_language', 'pt']);
      console.log('Configuração padrão para idioma criada');
    }
  });

  // Inserir um menu inicial de exemplo se a tabela estiver vazia
  db.get('SELECT COUNT(*) as count FROM menus', (err, row) => {
    if (err) {
      console.error('Erro ao verificar menus:', err.message);
      return;
    }

    if (row.count === 0) {
      db.run(`
        INSERT INTO menus (title, description, parent_id) 
        VALUES ('Bem-vindo', 'Bem-vindo ao AgafBot! Como posso ajudar?', NULL)
      `);
      db.run(`
        INSERT INTO menus (title, description, parent_id) 
        VALUES ('Sobre nós', 'Somos especialistas em soluções digitais.', 1)
      `);
      db.run(`
        INSERT INTO menus (title, description, parent_id) 
        VALUES ('Serviços', 'Oferecemos os seguintes serviços...', 1)
      `);
      console.log('Menus de exemplo criados');
    }
  });

  console.log('Inicialização do banco de dados concluída');
});

db.close(); 