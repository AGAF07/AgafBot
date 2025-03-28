const express = require('express');
const router = express.Router();
const db = require('../database/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const whatsapp = require('../models/whatsapp');

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only image, video, and PDF files are allowed!');
    }
  }
});

// Home page route
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'AgafBot - WhatsApp Automation with AI',
    youtubeLink: 'https://www.youtube.com/@AgafDigital-TeresaAndre'
  });
});

// Donation page route
router.get('/donate', (req, res) => {
  res.render('donate', { 
    title: 'Support AgafBot',
    paypalEmail: 'antoniofigueiredoha@gmail.com'
  });
});

// Dashboard route
router.get('/dashboard', (req, res) => {
  res.render('dashboard', { 
    title: 'AgafBot Dashboard',
    qrCode: whatsapp.getQrCode(),
    connectionStatus: whatsapp.getConnectionStatus(),
    error: null
  });
});

// WhatsApp status route for AJAX updates
router.get('/api/whatsapp-status', (req, res) => {
  const status = whatsapp.getConnectionStatus();
  const qrCode = status === 'qr_ready' ? whatsapp.getQrCode() : null;
  
  res.json({
    qrCode: qrCode,
    status: status
  });
});

// API Key configuration route
router.get('/settings', (req, res) => {
  // Get both API key and bot language settings
  db.all("SELECT key, value FROM config WHERE key IN ('groq_api_key', 'bot_language')", (err, rows) => {
    if (err) {
      console.error('Error fetching settings:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Process results into a more usable format
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    res.render('settings', { 
      title: 'Settings',
      apiKey: settings.groq_api_key || '',
      botLanguage: settings.bot_language || 'pt', // Default to Portuguese if not set
      error: null
    });
  });
});

// Update API key
router.post('/settings/update-api-key', (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }
  
  db.run("UPDATE config SET value = ? WHERE key = 'groq_api_key'", [apiKey], function(err) {
    if (err) {
      console.error('Error updating API key:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      db.run("INSERT INTO config (key, value, description) VALUES ('groq_api_key', ?, 'API key for Groq AI')", [apiKey], function(err) {
        if (err) {
          console.error('Error inserting API key:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ success: true, message: 'API key updated successfully' });
      });
    } else {
      res.json({ success: true, message: 'API key updated successfully' });
    }
  });
});

// Update bot language
router.post('/settings/update-language', (req, res) => {
  const { language } = req.body;
  
  if (!language) {
    return res.status(400).json({ error: 'Idioma é obrigatório' });
  }
  
  // Validate language
  const validLanguages = ['pt', 'en', 'es', 'fr', 'ru', 'zh', 'tr', 'ja', 'ar', 'ko'];
  if (!validLanguages.includes(language)) {
    return res.status(400).json({ error: 'Idioma inválido' });
  }
  
  db.run("UPDATE config SET value = ? WHERE key = 'bot_language'", [language], function(err) {
    if (err) {
      console.error('Error updating language:', err.message);
      return res.status(500).json({ error: 'Erro no banco de dados' });
    }
    
    if (this.changes === 0) {
      db.run("INSERT INTO config (key, value, description) VALUES ('bot_language', ?, 'Idioma que o bot usa para respostas')", [language], function(err) {
        if (err) {
          console.error('Error inserting language:', err.message);
          return res.status(500).json({ error: 'Erro no banco de dados' });
        }
        
        res.json({ success: true, message: 'Idioma atualizado com sucesso' });
      });
    } else {
      res.json({ success: true, message: 'Idioma atualizado com sucesso' });
    }
  });
});

// Responses management routes
router.get('/responses', (req, res) => {
  db.all("SELECT * FROM responses ORDER BY created_at DESC", (err, responses) => {
    if (err) {
      console.error('Error fetching responses:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    db.all("SELECT * FROM knowledge_base ORDER BY created_at DESC", (err, knowledgeBase) => {
      if (err) {
        console.error('Error fetching knowledge base:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.render('responses', { 
        title: 'Manage Responses',
        responses: responses,
        knowledgeBase: knowledgeBase || [],
        error: null
      });
    });
  });
});

router.post('/responses/add', (req, res) => {
  const { keyword, response } = req.body;
  
  if (!keyword || !response) {
    return res.status(400).json({ error: 'Palavra-chave e resposta são obrigatórias' });
  }
  
  db.run("INSERT INTO responses (keyword, response) VALUES (?, ?)", 
    [keyword, response], 
    function(err) {
      if (err) {
        console.error('Error adding response:', err.message);
        return res.status(500).json({ error: 'Erro no banco de dados. Por favor, tente novamente.' });
      }
      
      res.json({ 
        success: true, 
        message: 'Resposta adicionada com sucesso!',
        id: this.lastID
      });
    }
  );
});

router.post('/responses/update/:id', (req, res) => {
  const { id } = req.params;
  const { keyword, response } = req.body;
  
  if (!keyword || !response) {
    return res.status(400).json({ error: 'Keyword and response are required' });
  }
  
  db.run("UPDATE responses SET keyword = ?, response = ? WHERE id = ?", 
    [keyword, response, id], 
    function(err) {
      if (err) {
        console.error('Error updating response:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Response not found' });
      }
      
      res.json({ success: true, message: 'Response updated successfully' });
    }
  );
});

router.delete('/responses/delete/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM responses WHERE id = ?", [id], function(err) {
    if (err) {
      console.error('Error deleting response:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }
    
    res.json({ success: true, message: 'Response deleted successfully' });
  });
});

// Clear all responses
router.post('/responses/clear-all', (req, res) => {
  db.run("DELETE FROM responses", function(err) {
    if (err) {
      console.error('Error clearing responses:', err.message);
      return res.status(500).json({ error: 'Erro no banco de dados. Por favor, tente novamente.' });
    }
    
    console.log(`Deleted ${this.changes} responses`);
    res.json({ 
      success: true, 
      message: 'Todas as respostas foram removidas com sucesso!',
      count: this.changes
    });
  });
});

// Knowledge base management routes
router.post('/knowledge/add', (req, res) => {
  const { information, title } = req.body;
  
  if (!information) {
    return res.status(400).json({ error: 'O campo Informação é obrigatório' });
  }
  
  db.run("INSERT INTO knowledge_base (information, title) VALUES (?, ?)", 
    [information, title || null], 
    function(err) {
      if (err) {
        console.error('Error adding knowledge base entry:', err.message);
        return res.status(500).json({ error: 'Erro no banco de dados. Por favor, tente novamente.' });
      }
      
      res.json({ 
        success: true, 
        message: 'Informação adicionada com sucesso!',
        id: this.lastID
      });
    }
  );
});

router.post('/knowledge/update/:id', (req, res) => {
  const { id } = req.params;
  const { information, title } = req.body;
  
  if (!information) {
    return res.status(400).json({ error: 'Information is required' });
  }
  
  db.run("UPDATE knowledge_base SET information = ?, title = ? WHERE id = ?", 
    [information, title || null, id], 
    function(err) {
      if (err) {
        console.error('Error updating knowledge base entry:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Knowledge base entry not found' });
      }
      
      res.json({ success: true, message: 'Knowledge base entry updated successfully' });
    }
  );
});

router.delete('/knowledge/delete/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM knowledge_base WHERE id = ?", [id], function(err) {
    if (err) {
      console.error('Error deleting knowledge base entry:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }
    
    res.json({ success: true, message: 'Knowledge base entry deleted successfully' });
  });
});

// Clear all knowledge base entries
router.post('/knowledge/clear-all', (req, res) => {
  db.run("DELETE FROM knowledge_base", function(err) {
    if (err) {
      console.error('Error clearing knowledge base:', err.message);
      return res.status(500).json({ error: 'Erro no banco de dados. Por favor, tente novamente.' });
    }
    
    console.log(`Deleted ${this.changes} entries from knowledge base`);
    res.json({ 
      success: true, 
      message: 'Base de conhecimento limpa com sucesso!',
      count: this.changes
    });
  });
});

// Menu management routes
router.get('/menus', (req, res) => {
  db.all(`
    SELECT m.*, 
      CASE WHEN m.parent_id IS NULL THEN 'Main Menu' 
      ELSE (SELECT title FROM menus WHERE id = m.parent_id) 
      END as parent_name
    FROM menus m
    ORDER BY m.parent_id NULLS FIRST, m.title
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching menus:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    db.all("SELECT id, title FROM menus", (err, menuOptions) => {
      if (err) {
        console.error('Error fetching menu options:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.render('menus', { 
        title: 'Manage Menus',
        menus: rows,
        menuOptions: menuOptions,
        error: null
      });
    });
  });
});

router.post('/menus/add', upload.single('media'), (req, res) => {
  const { title, description, parent_id } = req.body;
  let media_url = null;
  let media_type = null;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  if (req.file) {
    media_url = `/uploads/${req.file.filename}`;
    media_type = req.file.mimetype.split('/')[0]; // image, video, application
  }
  
  const parentId = parent_id && parent_id !== '' ? parent_id : null;
  
  db.run(
    "INSERT INTO menus (title, description, parent_id, media_url, media_type) VALUES (?, ?, ?, ?, ?)", 
    [title, description, parentId, media_url, media_type], 
    function(err) {
      if (err) {
        console.error('Error adding menu:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ 
        success: true, 
        message: 'Menu added successfully',
        id: this.lastID
      });
    }
  );
});

router.post('/menus/update/:id', upload.single('media'), (req, res) => {
  const { id } = req.params;
  const { title, description, parent_id, keep_media } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  // Check for circular references in parent_id
  if (parent_id && parent_id !== '') {
    db.get("SELECT id FROM menus WHERE id = ? AND parent_id = ?", [parent_id, id], (err, row) => {
      if (err) {
        console.error('Error checking for circular reference:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        return res.status(400).json({ error: 'Circular reference detected. A menu cannot be its own grandchild.' });
      }
      
      updateMenu();
    });
  } else {
    updateMenu();
  }
  
  function updateMenu() {
    // Get the current menu to check for media
    db.get("SELECT media_url FROM menus WHERE id = ?", [id], (err, row) => {
      if (err) {
        console.error('Error fetching menu:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Menu not found' });
      }
      
      let media_url = row.media_url;
      let media_type = null;
      
      // If a new media file is uploaded, delete the old one and update
      if (req.file) {
        if (media_url && keep_media !== 'true') {
          const oldFilePath = path.join(__dirname, '../public', media_url);
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error('Error deleting old media file:', err);
          }
        }
        
        media_url = `/uploads/${req.file.filename}`;
        media_type = req.file.mimetype.split('/')[0];
      } else if (keep_media !== 'true') {
        // If keep_media is false and no new file is uploaded, remove the media
        if (media_url) {
          const oldFilePath = path.join(__dirname, '../public', media_url);
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error('Error deleting old media file:', err);
          }
        }
        media_url = null;
        media_type = null;
      }
      
      const parentId = parent_id && parent_id !== '' ? parent_id : null;
      
      db.run(
        "UPDATE menus SET title = ?, description = ?, parent_id = ?, media_url = ?, media_type = ? WHERE id = ?", 
        [title, description, parentId, media_url, media_type, id], 
        function(err) {
          if (err) {
            console.error('Error updating menu:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Menu not found' });
          }
          
          res.json({ success: true, message: 'Menu updated successfully' });
        }
      );
    });
  }
});

router.delete('/menus/delete/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if there are submenus
  db.get("SELECT COUNT(*) as count FROM menus WHERE parent_id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error checking for submenus:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete a menu that has submenus. Please delete the submenus first.' 
      });
    }
    
    // Get the media URL before deleting the menu
    db.get("SELECT media_url FROM menus WHERE id = ?", [id], (err, menu) => {
      if (err) {
        console.error('Error fetching menu:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Delete the menu
      db.run("DELETE FROM menus WHERE id = ?", [id], function(err) {
        if (err) {
          console.error('Error deleting menu:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Menu not found' });
        }
        
        // Delete the associated media file if it exists
        if (menu && menu.media_url) {
          const filePath = path.join(__dirname, '../public', menu.media_url);
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Error deleting media file:', err);
          }
        }
        
        res.json({ success: true, message: 'Menu deleted successfully' });
      });
    });
  });
});

module.exports = router; 