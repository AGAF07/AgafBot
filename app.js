const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const routes = require('./routes');
const whatsapp = require('./models/whatsapp');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public/uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'agafbot-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Routes
app.use('/', routes);

// Flag to skip WhatsApp client initialization
const skipWhatsApp = process.env.SKIP_WHATSAPP === 'true';

// Start the server and WhatsApp client
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Initialize WhatsApp client if not skipped
  if (!skipWhatsApp) {
    try {
      whatsapp.initializeWhatsApp();
      console.log('WhatsApp client initialization started');
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      console.log('Continuing with web server only...');
    }
  } else {
    console.log('WhatsApp client initialization skipped');
  }
}); 