/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: Hjælpefunktioner til at bygge stabile billedstier for lokale og seedede billeder
*/

const SEEDED_CAMPAIGN_IMAGE_MAP = {
  'campaign1.jpg': 'elderly-couple.jpg',
  'campaign2.jpg': 'animal-rescue.jpg',
  'campaign3.jpg': 'hospital-patient.jpg',
  'campaign4.jpg': 'animal-rescue.jpg'
}

// Builds a public image URL that respects Vite base path in dev and production.
function buildPublicImagePath (imageFileName) {
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
  return `${normalizedBasePath}images/${imageFileName}`
}

// Resolves campaign image values from API/database to a display-safe URL.
export function resolveCampaignImageSource (campaignImageValue, fallbackFileName = 'animal-rescue.jpg') {
  const rawImageValue = String(campaignImageValue || '').trim()

  if (!rawImageValue) {
    return buildPublicImagePath(fallbackFileName)
  }

  if (rawImageValue.startsWith('http://') || rawImageValue.startsWith('https://')) {
    return rawImageValue
  }

  if (rawImageValue.startsWith('/images/')) {
    return buildPublicImagePath(rawImageValue.replace('/images/', ''))
  }

  const normalizedFileName = SEEDED_CAMPAIGN_IMAGE_MAP[rawImageValue] || rawImageValue
  return buildPublicImagePath(normalizedFileName)
}

// Resolves logo file names to public image URLs.
export function resolveLogoImageSource (logoFileName, fallbackFileName = 'fundtogether-logo.png') {
  const rawLogoValue = String(logoFileName || '').trim()
  const normalizedLogoFileName = rawLogoValue || fallbackFileName
  return buildPublicImagePath(normalizedLogoFileName)
}
