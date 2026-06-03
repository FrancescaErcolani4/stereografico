# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm install --omit=dev

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copia node_modules dal builder
COPY --from=builder /app/node_modules ./node_modules

# Copia i file dell'applicazione
COPY . .

# Esponi la porta (Railway ha PORT come variabile d'ambiente)
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
