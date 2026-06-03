const express = require('express');
const path = require('path');
const app = express();

// Porta da usare (Railway usa PORT dall'environment, default 3000)
const PORT = process.env.PORT || 3000;

// Serve i file statici dalla cartella corrente
app.use(express.static(path.join(__dirname, '.')));

// Route per il PDF (fallback)
app.get('/plot.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, 'plot.pdf'));
});

// Route di default - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback per altre route - serve index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Errore del server!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
  console.log(`📄 PDF disponibile a http://localhost:${PORT}/plot.pdf`);
});
