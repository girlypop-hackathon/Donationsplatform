# /*
# Oprettet: 18-03-2026
# Af: Jonas og GitHub Copilot (GPT-5.3-codex)
# Beskrivelse: Docker image definition for the donation platform API
# */

FROM node:24-alpine

WORKDIR /app

COPY Backend/package*.json ./
RUN npm ci --omit=dev

COPY Backend/ ./

EXPOSE 3000

CMD ["npm", "run", "start-with-setup"]
