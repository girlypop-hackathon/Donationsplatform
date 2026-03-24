# /*
# Oprettet: 18-03-2026
# Af: Jonas og GitHub Copilot (GPT-5.3-codex)
# Beskrivelse: Docker image definition for the donation platform website (frontend + API)
# */

FROM node:20-alpine AS frontend-builder

WORKDIR /frontend-build

COPY package*.json ./
RUN npm ci

COPY Frontend ./Frontend
COPY config ./config
COPY public ./public
COPY index.html ./index.html
COPY vite.config.js ./vite.config.js

RUN npx vite build

FROM node:20-alpine

WORKDIR /app

COPY Backend/package*.json ./
RUN npm ci --omit=dev

COPY Backend/ ./
COPY --from=frontend-builder /frontend-build/dist ./public

EXPOSE 3000

CMD ["npm", "run", "start-with-setup"]
