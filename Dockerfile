# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copia solo il package.json per installare le dipendenze
COPY package.json ./

# CORRETTO: Installa solo le dipendenze di produzione senza pretendere il package-lock.json
RUN npm install --omit=dev

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copia i node_modules puliti dal builder
COPY --from=builder /app/node_modules ./node_modules

# Copia i file dell'applicazione (escludendo node_modules grazie a .dockerignore se presente)
COPY . .

# Esponi la porta dinamica (Railway sovrascrive questo valore)
EXPOSE 3000

# Healthcheck dinamico sulla porta assegnata da Railway (evita il blocco su localhost:3000 fisso)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get(\`http://localhost:\${port}\`, (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]