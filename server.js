const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from current directory
app.use(express.static('.'));

// API endpoint for Claude AI (proxy to PHP endpoint if needed)
app.post('/api/claude-ai.php', (req, res) => {
  // For now, return a message indicating PHP endpoints need to be converted
  res.json({
    error: "PHP endpoints need to be converted to Node.js. Please update the API implementation."
  });
});

// API endpoint for Speech to Text (proxy to PHP endpoint if needed)
app.post('/api/speech-to-text.php', (req, res) => {
  // For now, return a message indicating PHP endpoints need to be converted
  res.json({
    error: "PHP endpoints need to be converted to Node.js. Please update the API implementation."
  });
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Listen on port provided by Glitch or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT} to view the app`);
});