const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('../database/db');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
let apiKey = '';
let groqClient = null;
let lastQrCode = null;
let connectionStatus = 'disconnected';
let botLanguage = 'pt'; // Default language is Portuguese

// Track when last greeting was sent to each user
const userGreetings = {};

// Get the API key and language from the database
db.all("SELECT key, value FROM config WHERE key IN ('groq_api_key', 'bot_language')", (err, rows) => {
  if (err) {
    console.error('Error fetching settings:', err.message);
  } else {
    // Process results into a more usable format
    rows.forEach(row => {
      if (row.key === 'groq_api_key' && row.value) {
        apiKey = row.value;
        groqClient = new Groq({ apiKey });
        console.log('Groq API key loaded.');
      } else if (row.key === 'bot_language' && row.value) {
        botLanguage = row.value;
        console.log(`Bot language set to: ${botLanguage}`);
      }
    });
  }
});

// Function to find the first available browser
function findAvailableBrowser() {
  if (process.platform === 'win32') {
    const browsers = [
      { name: 'Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
      { name: 'Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
      { name: 'Chrome (x86)', path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' },
      { name: 'Firefox', path: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe' },
      { name: 'Firefox (x86)', path: 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe' },
      { name: 'Opera', path: 'C:\\Program Files\\Opera\\launcher.exe' },
      { name: 'Opera (x86)', path: 'C:\\Program Files (x86)\\Opera\\launcher.exe' },
      { name: 'Opera GX', path: 'C:\\Program Files\\Opera GX\\launcher.exe' },
      { name: 'Opera GX (x86)', path: 'C:\\Program Files (x86)\\Opera GX\\launcher.exe' }
    ];
    
    for (const browser of browsers) {
      if (fs.existsSync(browser.path)) {
        console.log(`Using ${browser.name} browser for WhatsApp Web`);
        return browser.path;
      }
    }
    console.warn('No compatible browser found. Continuing without specifying browser path.');
    return null;
  } else if (process.platform === 'darwin') {
    const browsers = [
      { name: 'Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
      { name: 'Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
      { name: 'Firefox', path: '/Applications/Firefox.app/Contents/MacOS/firefox' },
      { name: 'Opera', path: '/Applications/Opera.app/Contents/MacOS/Opera' }
    ];
    
    for (const browser of browsers) {
      if (fs.existsSync(browser.path)) {
        console.log(`Using ${browser.name} browser for WhatsApp Web`);
        return browser.path;
      }
    }
    console.warn('No compatible browser found. Continuing without specifying browser path.');
    return null;
  } else { // Linux
    // Try to find Chrome, Chromium, or Firefox on Linux
    const browsers = [
      { name: 'Chrome', path: '/usr/bin/google-chrome' },
      { name: 'Chromium', path: '/usr/bin/chromium-browser' },
      { name: 'Firefox', path: '/usr/bin/firefox' },
      { name: 'Opera', path: '/usr/bin/opera' }
    ];
    
    for (const browser of browsers) {
      if (fs.existsSync(browser.path)) {
        console.log(`Using ${browser.name} browser for WhatsApp Web`);
        return browser.path;
      }
    }
    console.warn('No compatible browser found. Continuing without specifying browser path.');
    return null;
  }
}

// Initialize WhatsApp client
const browserPath = findAvailableBrowser();
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions'],
    ...(browserPath ? { executablePath: browserPath } : {})
  }
});

// Event handlers
client.on('qr', (qr) => {
  console.log('QR RECEIVED, scan with WhatsApp');
  qrcode.generate(qr, { small: true });
  lastQrCode = qr;
  connectionStatus = 'qr_ready';
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  connectionStatus = 'connected';
  lastQrCode = null;
});

client.on('authenticated', () => {
  console.log('WhatsApp client authenticated');
  connectionStatus = 'authenticated';
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp authentication failed:', msg);
  connectionStatus = 'auth_failure';
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp client disconnected:', reason);
  connectionStatus = 'disconnected';
});

// Handle incoming messages
client.on('message', async (message) => {
  if (message.body.startsWith('!menu')) {
    // Send main menu
    sendMenu(message, null);
    return;
  }

  if (message.body.startsWith('!option')) {
    // Handle menu option selection
    const option = message.body.split(' ')[1];
    if (option) {
      handleMenuSelection(message, parseInt(option));
    }
    return;
  }

  // Check if the message is just a number (menu selection)
  const numericInput = message.body.trim();
  if (/^\d+$/.test(numericInput)) {
    // It's a pure number, treat as menu selection
    handleMenuSelection(message, parseInt(numericInput));
    return;
  }

  // Process message with AI if not a command
  processMessageWithAI(message);
});

// Safe reply function to handle quoted message errors
async function safeReply(message, content, options = {}) {
  try {
    // First attempt to use the normal reply method
    return await message.reply(content, undefined, options);
  } catch (error) {
    console.log('Error using reply method, falling back to direct message:', error.message);
    
    // If reply fails, send a direct message instead
    const chat = await message.getChat();
    return await client.sendMessage(chat.id._serialized, content, options);
  }
}

// Function to send main menu or submenu
async function sendMenu(message, parentId) {
  try {
    const query = parentId 
      ? `SELECT id, title, description, media_url FROM menus WHERE parent_id = ? ORDER BY id` 
      : `SELECT id, title, description, media_url FROM menus WHERE parent_id IS NULL ORDER BY id`;
    
    const params = parentId ? [parentId] : [];
    
    db.all(query, params, async (err, menus) => {
      if (err) {
        console.error('Error fetching menus:', err);
        await safeReply(message, 'Desculpe, ocorreu um erro ao buscar o menu.');
        return;
      }

      if (menus.length === 0) {
        await safeReply(message, 'Não há opções de menu disponíveis.');
        return;
      }

      let menuText = "*Menu*\n\n";
      menus.forEach((item) => {
        menuText += `*${item.id}*. ${item.title}\n`;
        if (item.description) {
          menuText += `   ${item.description}\n`;
        }
      });

      menuText += '\nPara selecionar uma opção, digite apenas o número correspondente (ex: 1)';
      await safeReply(message, menuText);

      // Send media separately if available
      for (const item of menus) {
        if (item.media_url) {
          try {
            const mediaPath = path.join(__dirname, '../public', item.media_url);
            console.log(`Attempting to send media from path: ${mediaPath}`);
            
            if (fs.existsSync(mediaPath)) {
              const media = MessageMedia.fromFilePath(mediaPath);
              await safeReply(message, media, { caption: `${item.id}. ${item.title}` });
              console.log('Media sent successfully');
            } else {
              console.error(`Media file not found at path: ${mediaPath}`);
            }
          } catch (error) {
            console.error('Error sending media:', error);
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in sendMenu:', error);
    await safeReply(message, 'Desculpe, ocorreu um erro com o sistema de menu.');
  }
}

// Handle menu selection
async function handleMenuSelection(message, menuId) {
  try {
    // Get the selected menu item
    db.get('SELECT * FROM menus WHERE id = ?', [menuId], async (err, menu) => {
      if (err || !menu) {
        console.error('Error fetching menu item:', err);
        await safeReply(message, 'Desculpe, essa opção de menu não existe.');
        return;
      }

      // Check if there are submenus for this menu
      db.all('SELECT COUNT(*) as count FROM menus WHERE parent_id = ?', [menuId], async (err, result) => {
        if (err) {
          console.error('Error checking for submenus:', err);
          await safeReply(message, 'Desculpe, ocorreu um erro ao processar seu pedido.');
          return;
        }

        // Send menu content
        let response = `*${menu.title}*\n\n`;
        if (menu.description) {
          response += `${menu.description}\n\n`;
        }

        await safeReply(message, response);

        // If there's media attached to this menu item, send it
        if (menu.media_url) {
          try {
            const mediaPath = path.join(__dirname, '../public', menu.media_url);
            console.log(`Attempting to send media from path: ${mediaPath}`);
            
            if (fs.existsSync(mediaPath)) {
              const media = MessageMedia.fromFilePath(mediaPath);
              await safeReply(message, media, { caption: menu.title });
              console.log('Media sent successfully');
            } else {
              console.error(`Media file not found at path: ${mediaPath}`);
            }
          } catch (error) {
            console.error('Error sending media:', error);
          }
        }

        // If this menu has submenus, show them
        if (result[0].count > 0) {
          await sendMenu(message, menuId);
        }
      });
    });
  } catch (error) {
    console.error('Error in handleMenuSelection:', error);
    await safeReply(message, 'Desculpe, ocorreu um erro ao processar sua seleção.');
  }
}

// Function to get greeting based on time and language
function getGreeting(username, language = botLanguage) {
  const currentHour = new Date().getHours();
  let greeting = '';
  
  switch (language) {
    case 'en':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `Good morning, ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `Good afternoon, ${username}! `;
      } else {
        greeting = `Good evening, ${username}! `;
      }
      break;
    case 'es':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `Buenos días, ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `Buenas tardes, ${username}! `;
      } else {
        greeting = `Buenas noches, ${username}! `;
      }
      break;
    case 'fr':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `Bonjour, ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `Bon après-midi, ${username}! `;
      } else {
        greeting = `Bonsoir, ${username}! `;
      }
      break;
    case 'ru':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `Доброе утро, ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `Добрый день, ${username}! `;
      } else {
        greeting = `Добрый вечер, ${username}! `;
      }
      break;
    case 'zh':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `早上好，${username}！`;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `下午好，${username}！`;
      } else {
        greeting = `晚上好，${username}！`;
      }
      break;
    case 'tr':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `Günaydın, ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `İyi günler, ${username}! `;
      } else {
        greeting = `İyi akşamlar, ${username}! `;
      }
      break;
    case 'ja':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `おはようございます、${username}さん！`;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `こんにちは、${username}さん！`;
      } else {
        greeting = `こんばんは、${username}さん！`;
      }
      break;
    case 'ar':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `صباح الخير، ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `مساء الخير، ${username}! `;
      } else {
        greeting = `مساء الخير، ${username}! `;
      }
      break;
    case 'ko':
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `안녕하세요, ${username}님! 좋은 아침입니다. `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `안녕하세요, ${username}님! 좋은 오후입니다. `;
      } else {
        greeting = `안녕하세요, ${username}님! 좋은 저녁입니다. `;
      }
      break;
    case 'pt':
    default:
      if (currentHour >= 5 && currentHour < 12) {
        greeting = `Bom dia, ${username}! `;
      } else if (currentHour >= 12 && currentHour < 18) {
        greeting = `Boa tarde, ${username}! `;
      } else {
        greeting = `Boa noite, ${username}! `;
      }
      break;
  }
  
  return greeting;
}

// Process message with Groq AI
async function processMessageWithAI(message) {
  try {
    // Get the sender's name and chat
    const contact = await message.getContact();
    const chat = await message.getChat();
    const username = contact.pushname || 'User';
    
    // Check if we should send a greeting based on time period
    const currentHour = new Date().getHours();
    const timePeriod = currentHour >= 5 && currentHour < 12 ? 'morning' : 
                      (currentHour >= 12 && currentHour < 18 ? 'afternoon' : 'evening');
    
    // Initialize greeting tracking for this user if needed
    if (!userGreetings[chat.id._serialized]) {
      userGreetings[chat.id._serialized] = {
        lastGreetingPeriod: null,
        lastGreetingTime: null
      };
    }
    
    // Determine if we should include a greeting
    const userGreetingData = userGreetings[chat.id._serialized];
    const currentTime = new Date().getTime();
    const sixHoursInMs = 6 * 60 * 60 * 1000;
    const shouldGreet = 
      userGreetingData.lastGreetingPeriod !== timePeriod || 
      !userGreetingData.lastGreetingTime || 
      (currentTime - userGreetingData.lastGreetingTime) > sixHoursInMs;
    
    // Update greeting tracking
    if (shouldGreet) {
      userGreetingData.lastGreetingPeriod = timePeriod;
      userGreetingData.lastGreetingTime = currentTime;
    }
    
    // Get the appropriate greeting text if needed
    const greeting = shouldGreet ? getGreeting(username, botLanguage) : '';
    
    // First, check if we have a predefined response in the database
    db.all(
      'SELECT response FROM responses WHERE ? LIKE "%" || keyword || "%"', 
      [message.body], 
      async (err, rows) => {
        if (err) {
          console.error('Error checking for predefined responses:', err.message);
          return;
        }

        // If we have a matching response in the database, use it
        if (rows.length > 0) {
          const randomIndex = Math.floor(Math.random() * rows.length);
          await safeReply(message, greeting + rows[randomIndex].response);
          return;
        }
        
        // Check for general knowledge base entries
        db.all(
          'SELECT information FROM knowledge_base',
          async (err, knowledgeRows) => {
            if (err) {
              console.error('Error checking knowledge base:', err.message);
              return;
            }
            
            // Otherwise, use Groq API
            if (!groqClient) {
              console.error('Groq client not initialized.');
              await safeReply(message, 'Desculpe, o serviço de IA está indisponível no momento.');
              return;
            }

            try {
              // Prepare the context with available database responses and knowledge base
              db.all('SELECT keyword, response FROM responses', async (err, allResponses) => {
                if (err) {
                  console.error('Error fetching responses from database:', err.message);
                  return;
                }

                // Format database content as context for the AI
                let contextString = "Here is the database of information you can use to respond:\n\n";
                
                // Add keyword-based responses
                allResponses.forEach(item => {
                  contextString += `Topic: ${item.keyword}\nInformation: ${item.response}\n\n`;
                });
                
                // Add general knowledge base entries
                if (knowledgeRows && knowledgeRows.length > 0) {
                  contextString += "General company information:\n\n";
                  knowledgeRows.forEach(item => {
                    contextString += `${item.information}\n\n`;
                  });
                }

                // Add instructions for the AI with the chosen language
                const languageInstructions = {
                  'pt': "Responda SEMPRE em português do Brasil, de forma conversacional e amigável. Mantenha respostas curtas e naturais como um humano faria, a menos que o usuário solicite informações detalhadas. Use linguagem informal.",
                  'en': "ALWAYS respond in English, in a conversational and friendly manner. Keep responses short and natural unless the user specifically asks for detailed information. Use informal language.",
                  'es': "Responda SIEMPRE en español, de manera conversacional y amigable. Mantenga las respuestas breves y naturales a menos que el usuario solicite información detallada. Use lenguaje informal.",
                  'fr': "Repondez TOUJOURS en francais, de maniere conversationnelle et amicale. Gardez les reponses courtes et naturelles sauf si l'utilisateur demande des informations detaillees. Utilisez un langage informel.",
                  'ru': "ВСЕГДА отвечайте на русском языке, в разговорной и дружелюбной манере. Сохраняйте ответы короткими и естественными, если пользователь не запрашивает подробную информацию. Используйте неформальный язык.",
                  'zh': "请始终用中文回答，语气要自然友好，像对话一样。除非用户要求详细信息，否则保持回复简短自然。使用非正式语言。",
                  'tr': "DAIMA Turkce olarak, sohbet havasinda ve samimi bir sekilde yanit verin. Kullanici ayrintili bilgi istemedigi surece yanitlari kisa ve dogal tutun. Resmi olmayan bir dil kullanin.",
                  'ja': "常に日本語で、会話的でフレンドリーな方法で応答してください。ユーザーが詳細情報を要求しない限り、返答は短く自然にしてください。カジュアルな言葉を使ってください。",
                  'ar': "الرجاء الرد دائمًا باللغة العربية، بطريقة ودية ومحادثة. اجعل الردود قصيرة وطبيعية ما لم يطلب المستخدم معلومات مفصلة. استخدم لغة غير رسمية.",
                  'ko': "항상 한국어로 대화하듯이 친근하게 응답하세요. 사용자가 상세한 정보를 요청하지 않는 한 답변을 짧고 자연스럽게 유지하세요. 비격식적인 언어를 사용하세요."
                };

                const greetingInstruction = shouldGreet ? 
                  `Include this greeting at the start of your response: "${greeting}"` : 
                  "Do not include any greeting, just respond directly to the question as if continuing a conversation.";

                const prompt = `${contextString}
                
Based ONLY on the information provided above, please answer the following message in a conversational, human-like manner. If you don't have enough information in the database to answer properly, just say you don't have enough information.

${languageInstructions[botLanguage] || languageInstructions['pt']}

User's name: ${username}
Current time: ${new Date().toLocaleTimeString()}
User message: ${message.body}

${greetingInstruction}

Important notes:
- Keep responses short and concise unless the user is specifically asking for detailed information.
- Respond like a human would in casual conversation.
- Don't use formulaic language like "How can I help you today?"
- Be friendly but not overly formal.`;

                const completion = await groqClient.chat.completions.create({
                  messages: [{ role: 'user', content: prompt }],
                  model: 'llama3-8b-8192',
                });

                const aiResponse = completion.choices[0].message.content;
                await safeReply(message, aiResponse);
              });
            } catch (error) {
              console.error('Error processing with Groq AI:', error);
              await safeReply(message, 'Desculpe, ocorreu um erro ao processar seu pedido.');
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Error in processMessageWithAI:', error);
  }
}

// Function to get QR code for web interface
function getQrCode() {
  return lastQrCode;
}

// Function to get connection status
function getConnectionStatus() {
  return connectionStatus;
}

// Initialize the WhatsApp client
function initializeWhatsApp() {
  client.initialize();
}

module.exports = {
  client,
  initializeWhatsApp,
  getQrCode,
  getConnectionStatus
}; 