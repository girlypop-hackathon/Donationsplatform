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
1. I samme mappe, kør:
	```bash
	npm run dev
	```
2. Terminalen viser en URL (typisk `http://localhost:5173`)
3. Åbn URL'en i din browser – nu ser du React‑appen (navbar, forside med kampagner osv.)

> **Vigtigt:** Åbn ikke `index.html` direkte i browseren. Brug altid `npm run dev`, så Vite kan bygge og serve appen korrekt.

## Hvorfor Vite og React?

- **React** bruges til at bygge brugergrænsefladen som genanvendelige komponenter (Navbar, CampaignCard, sider osv.).
- **Vite** er en moderne udviklingsserver og bundler, som:
  - giver hurtig start og hot reload (ændringer i koden vises straks i browseren)
  - håndterer JavaScript‑moduler, JSX og import af filer automatisk
  - gør det nemt senere at lave en optimeret build til produktion.

Kombinationen af React + Vite gør det hurtigt at udvikle og nemt at køre projektet uden selv at sætte Webpack eller andre bundlere op.

## AI prompt
spec kit - hvordan foreslår de at man udvikler med AI. Laver kravspekifekation og man vericiferer
