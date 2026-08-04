import { getSpectralProcessing } from "../Shared/Product";

/**
 * Builds the technical specification list for a product.
 */
export const buildTechSpecs = (
  itemName: string = "",
  geometricProcessing: string = "",
  spectralBands: string = ""
): string[] => {
  const name = itemName.toLowerCase();

  let swath = "";
  let processing = "";

  /* ── Swath logic ───────────────────────────────────────────── */
  if (name.includes("pleiades 0.5")) {
    swath = "Swath: 20 km";
  }

  if (name.includes("pleiades-neo-0.3")) {
    swath = "Swath: 14 km";
  }

  if (name.includes("spot 1.5")) {
    swath = "Swath: 60 km";
  }

  /* ── Processing logic ──────────────────────────────────────── */
  if (name.includes("mono")) {
    processing = "Ortho Rectified";
  }

  if (name.includes("stereo")) {
    processing = "Ortho Ready";
  }

  if (name.includes("tristereo")) {
    processing = "";
  }

  /* ── Check if spectral processing is available ─────────────── */
  const spectralConfig = getSpectralProcessing(itemName);

  const hasSpectral: boolean =
    !!spectralConfig &&
    Array.isArray(spectralConfig.values) &&
    spectralConfig.values.length > 0;

  /* ── Build specs dynamically ───────────────────────────────── */
  const specs: string[] = [
    "Cloud Cover: ≤ 10%",
    `Geo Processing: ${geometricProcessing || "Ortho"}`,
  ];

  // Add spectral bands only if supported
  if (hasSpectral) {
    specs.push(`Spectral Bands: ${spectralBands || "Selected"}`);
  }

  specs.push(
    swath || "Swath: Standard",
    "Identical Twin Satellite"
  );

  if (processing) {
    specs.push(processing);
  }

  return specs;
};