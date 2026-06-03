# 📐 Proiezione Stereografica - Visualizzazione Interattiva

Visualizzazione WebGL interattiva della proiezione stereografica con relazione scientifica in LaTeX.

## 🎯 Caratteristiche

- **Visualizzazione 3D Interattiva**: Ruota, zoom e ispezione della proiezione stereografica
- **GeoGebra Integration**: Costruzione geometrica interattiva
- **Relazione Scientifica**: Documentazione completa in PDF con analisi storica e matematica
- **Responsive Design**: Funziona su desktop, tablet e mobile

## 🚀 Deploy su Railway

### Prerequisiti
- Account su [Railway.app](https://railway.app)
- Git installato localmente
- Nessuna dipendenza locale (il Dockerfile gestisce tutto)

### Opzione 1: Deploy Automatico (Consigliato)

1. **Collega il repository a Railway:**
   ```bash
   # Dalla dashboard Railway: 
   # New Project → Deploy from GitHub → Seleziona questo repo
   ```

2. **Railway rileverà automaticamente:**
   - Dockerfile nel progetto
   - Variabili d'ambiente necessarie (PORT)
   - Comando di start da package.json

3. **Deploy completato!** 🎉

### Opzione 2: Deploy Manuale con Railway CLI

```bash
# Installa Railway CLI
npm i -g @railway/cli

# Effettua il login
railway login

# Inicializza il progetto Railway nella cartella
railway init

# Deploy
railway up
```

## 🔧 Configurazione Railway

Il file `railway.toml` contiene le configurazioni di build:

```toml
[build]
builder = "dockerfile"          # Usa il Dockerfile
dockerfile = "Dockerfile"

[deploy]
startCommand = "npm start"      # Comando di avvio
healthcheckPath = "/"           # Health check della app
```

**Variabili d'ambiente automatiche:**
- `PORT`: Assegnata automaticamente da Railway (default: 3000)
- `NODE_ENV`: Impostato su "production"

## 📦 Installazione Locale

```bash
# Installa dipendenze
npm install

# Esegui il server
npm start

# Il sito sarà disponibile su http://localhost:3000
# PDF su http://localhost:3000/plot.pdf
```

## 📁 Struttura Progetto

```
Project/
├── index.html           # SPA principale
├── style.css            # Stili
├── main.js              # Logica WebGL
├── plot.pdf             # Relazione LaTeX
├── plot.tex             # Sorgente LaTeX
├── server.js            # Server Express
├── package.json         # Dipendenze Node.js
├── Dockerfile           # Configurazione Docker
├── railway.toml         # Configurazione Railway
├── .dockerignore        # File da escludere da Docker
└── .gitignore           # File da escludere da Git
```

## 📄 File Principali

### server.js
Server Express che serve:
- I file statici (HTML, CSS, JS)
- Il PDF della relazione LaTeX
- Support per SPA (Single Page Application)

### Dockerfile
Build multi-stage ottimizzato per Railway:
- Usa Node.js 18 Alpine (leggero)
- Installa solo dipendenze di produzione
- Include healthcheck
- Espone porta 3000

## 🌐 Accesso Dopo il Deploy

Una volta deployato su Railway:

```
🔗 App: https://[your-project].railway.app
📄 PDF: https://[your-project].railway.app/plot.pdf
```

## 🆘 Troubleshooting

### "Port already in use"
```bash
# Usa una porta diversa localmente
PORT=4000 npm start
```

### Docker build fails
```bash
# Pulisci build cache
docker system prune -a

# Riprova il build
docker build -t proiezione-stereografica .
```

### PDF non caricato
Assicurati che `plot.pdf` sia nella stessa cartella di `server.js`

## 📚 Documentazione Relativa

- [Railway.app Documentation](https://docs.railway.app)
- [Express.js Guide](https://expressjs.com)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices)

---

**Autore**: Francesca Ercolani  
**Corso**: Calcolo Numerico e Software Didattico, a.a 2025/2026  
**Università**: UNIBO - Dipartimento di Matematica
