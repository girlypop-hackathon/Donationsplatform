# Donationsplatform

10 day vibe hackaton

## Sådan kører du projektet

Projektet er bygget med **React** og **Vite**.

### Krav

- Node.js installeret (fx version 18+)

### Installation

1. Åbn en terminal i projektmappen (`Donationsplatform` – der hvor `package.json` ligger)
2. Kør:
   ```bash
   npm install
   ```

### Udviklingsserver

1. I samme mappe - fra roden, kør:
   ```bash
   npm run dev
   ```
2. Åbn`http://localhost:5173`

### Backend server
1. Start og sæt databasen op
    ```
   cd Backend 

   npm run start-with-setup
   ```
2. Start når databasen allerede er sat op tidligere
    ```
   cd Backend

   npm start
   ```

## Linting og formatering

Kør disse kommandoer fra projektets rodmappe (`Donationsplatform`):

```bash

- `npm run lint` kører den samlede lint gate for både frontend og backend
- `npm run lint:frontend` kører Standard på Frontend-mappen (bruges af CI lint gate)
- `npm run lint:backend` kører ESLint på Backend-mappen
- `npm run lint:fix` retter automatisk de fleste frontend lint-fejl
- `npm run format` kører Prettier på hele projektet
```

## Automatisk linting ved push

Der er nu en GitHub Actions workflow i `.github/workflows/lint.yml`.

- Kører automatisk ved `push` og `pull_request` til `main`, `master` og `develop`
- Kører `npm ci` og derefter `npm run lint`
- Tjekker både frontend og backend
- Hvis lint fejler, fejler workflowet også (lint gate)

## AI prompt

spec kit - hvordan foreslår de at man udvikler med AI. Laver kravspekifekation og man vericiferer


