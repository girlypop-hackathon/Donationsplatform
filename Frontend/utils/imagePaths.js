/*
Oprettet: ?
Af: ?
Beskrivelse: Hjælpefunktioner til at bygge stabile billedstier for lokale og seedede billeder
*/

const SEEDED_CAMPAIGN_IMAGE_MAP = {
  "campaign1.jpg": "elderly-couple.jpg",
  "campaign2.jpg": "animal-rescue.jpg",
  "campaign3.jpg": "hospital-patient.jpg",
  "campaign4.jpg": "animal-rescue.jpg",
};

function normalizeImageFileName(imageValue) {
  const normalizedValue = String(imageValue || "")
    .trim()
    .replace(/\\/g, "/");

  if (!normalizedValue) {
    return "";
  }

  const withoutLeadingDot = normalizedValue.startsWith("./")
    ? normalizedValue.slice(2)
    : normalizedValue;

  if (withoutLeadingDot.startsWith("public/images/")) {
    return withoutLeadingDot.replace("public/images/", "");
  }

  if (withoutLeadingDot.startsWith("/images/")) {
    return withoutLeadingDot.replace("/images/", "");
  }

  if (withoutLeadingDot.startsWith("images/")) {
    return withoutLeadingDot.replace("images/", "");
  }

  return withoutLeadingDot;
}

// Builds a public image URL that respects Vite base path in dev and production.
function buildPublicImagePath(imageFileName) {
  const basePath = import.meta.env.BASE_URL || "/";
  const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBasePath}images/${imageFileName}`;
}

// Generates an inline SVG placeholder that always renders, even if local assets fail.
export function createImagePlaceholderDataUri(label = "Campaign") {
  const safeLabel = encodeURIComponent(String(label || "Campaign"));
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"675\" viewBox=\"0 0 1200 675\"><defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#f7f8fb\"/><stop offset=\"100%\" stop-color=\"#e8ecf4\"/></linearGradient></defs><rect width=\"1200\" height=\"675\" fill=\"url(#g)\"/><g fill=\"none\" stroke=\"#c8d0df\" stroke-width=\"4\"><rect x=\"360\" y=\"178\" width=\"480\" height=\"300\" rx=\"24\"/><path d=\"M390 428l126-130 96 90 84-78 114 118\"/></g><circle cx=\"754\" cy=\"272\" r=\"30\" fill=\"#c8d0df\"/><text x=\"600\" y=\"554\" text-anchor=\"middle\" font-family=\"Segoe UI, Arial, sans-serif\" font-size=\"34\" fill=\"#60708f\">${safeLabel}</text></svg>`)}`;
}

// Resolves campaign image values from API/database to a display-safe URL.
export function resolveCampaignImageSource(
  campaignImageValue,
  fallbackFileName = "fundtogether-logo.png",
) {
  const rawImageValue = String(campaignImageValue || "").trim();

  if (!rawImageValue) {
    return buildPublicImagePath(fallbackFileName);
  }

  if (
    rawImageValue.startsWith("http://") ||
    rawImageValue.startsWith("https://")
  ) {
    return rawImageValue;
  }

  if (rawImageValue.startsWith("data:") || rawImageValue.startsWith("blob:")) {
    return rawImageValue;
  }

  if (rawImageValue.startsWith("/") && !rawImageValue.startsWith("/images/")) {
    return rawImageValue;
  }

  const normalizedInput = normalizeImageFileName(rawImageValue);
  const normalizedFileName =
    SEEDED_CAMPAIGN_IMAGE_MAP[normalizedInput] || normalizedInput;
  return buildPublicImagePath(normalizedFileName);
}

// Resolves logo file names to public image URLs.
export function resolveLogoImageSource(
  logoFileName,
  fallbackFileName = "fundtogether-logo.png",
) {
  const rawLogoValue = String(logoFileName || "").trim();
  const normalizedLogoFileName =
    normalizeImageFileName(rawLogoValue) || fallbackFileName;
  return buildPublicImagePath(normalizedLogoFileName);
}

// Applies a fallback image source once to avoid repeated onError loops.
export function applyImageFallbackOnce(
  event,
  fallbackSource,
  backupFallbackSource = createImagePlaceholderDataUri(),
) {
  if (!event?.currentTarget || !fallbackSource) {
    return;
  }

  const imageElement = event.currentTarget;
  const alreadyTriedPrimaryFallback =
    imageElement.dataset.fallbackTried === "true";

  if (alreadyTriedPrimaryFallback) {
    imageElement.onerror = null;
    imageElement.src = backupFallbackSource;
    return;
  }

  imageElement.dataset.fallbackTried = "true";
  imageElement.src = fallbackSource;
}
