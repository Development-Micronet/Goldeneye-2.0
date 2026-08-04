
export interface Option {
  Label: string;
  Value: string;
}

export interface SpectralProcessingValue {
  id: string;
  label: string;
  constraint?: {
    reject: boolean;
    defaultValueCondition: string;
  };
}

export interface SpectralProcessing {
  category: string;
  label: string;
  name: string;
  type: string;
  mandatory: boolean;
  values: SpectralProcessingValue[];
}

export interface ProductData {
  name: string;
  spectral_processing: SpectralProcessing;
}

export const GeometricProcessing: Option[] = [
  { Label: "Ortho", Value: "Ortho" },
  { Label: "Projected", Value: "Projected" },
  { Label: "Primary", Value: "Primary" },
];

export const TechnicalSpecification: string[] = [
  "Cloud Cover: ≤ 10%",
  "Geo Processing: Ortho",
  "Spectral Bands: Multispectral 4-band",
  "Swath: 20 km",
  "Twin Satellite",
  "Ortho",
];

export const productData: ProductData[] = [
  {
    name: "PNEO",
    spectral_processing: {
      category: "production_option",
      label: "SPECTRAL_PROCESSING",
      name: "spectral_processing",
      type: "list",
      mandatory: true,
      values: [
        { id: "panchromatic", label: "Panchromatic 1.5m" },
        {
          id: "pansharpened",
          label: "Pansharpened 1.5m 4-band",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:^(?!primary).*$",
          },
        },
        { id: "multispectral", label: "Multispectral 6m 4-band" },
        {
          id: "pansharpened_natural_color",
          label: "Pansharpened 1.5m 3-band, Natural Color",
        },
        {
          id: "pansharpened_false_color",
          label: "Pansharpened 1.5m 3-band, False Color",
        },
        {
          id: "bundle",
          label:
            "Bundle: Panchromatic 1.5m + Multispectral 6m 4-band - co-registrated",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:(primary)",
          },
        },
      ],
    },
  },
  {
    name: "SPOT",
    spectral_processing: {
      category: "production_option",
      label: "SPECTRAL_PROCESSING",
      name: "spectral_processing",
      type: "list",
      mandatory: true,
      values: [
        { id: "panchromatic", label: "Panchromatic 1.5m" },
        {
          id: "pansharpened",
          label: "Pansharpened 1.5m 4-band",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:^(?!primary).*$",
          },
        },
        { id: "multispectral", label: "Multispectral 6m 4-band" },
        {
          id: "pansharpened_natural_color",
          label: "Pansharpened 1.5m 3-band, Natural Color",
        },
        {
          id: "pansharpened_false_color",
          label: "Pansharpened 1.5m 3-band, False Color",
        },
        {
          id: "bundle",
          label:
            "Bundle: Panchromatic 1.5m + Multispectral 6m 4-band - co-registrated",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:(primary)",
          },
        },
      ],
    },
  },
  {
    name: "Pleiades",
    spectral_processing: {
      category: "production_option",
      label: "SPECTRAL_PROCESSING",
      name: "spectral_processing",
      type: "list",
      mandatory: true,
      values: [
        { id: "panchromatic", label: "Panchromatic 50cm" },
        {
          id: "pansharpened",
          label: "Pansharpened 50cm 4-band",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:^(?!primary).*$",
          },
        },
        { id: "multispectral", label: "Multispectral 2m 4-band" },
        {
          id: "pansharpened_natural_color",
          label: "Pansharpened 50cm 3-band, Natural Color",
        },
        {
          id: "pansharpened_false_color",
          label: "Pansharpened 50cm 3-band, False Color",
        },
        {
          id: "bundle",
          label: "Bundle: Panchromatic 50cm + Multispectral 2m 4-band",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:(primary)",
          },
        },
      ],
    },
  },
  {
    name: "Pleiades 0.3",
    spectral_processing: {
      category: "production_option",
      label: "SPECTRAL_PROCESSING",
      name: "spectral_processing",
      type: "list",
      mandatory: true,
      values: [
        {
          id: "panchromatic",
          label: "Panchromatic 30cm",
        },
        {
          id: "pansharpened",
          label: "Pansharpened 30cm 4-band",
          constraint: {
            reject: false,
            defaultValueCondition: "processing_level:^(?!primary).*$",
          },
        },
        {
          id: "multispectral",
          label: "Multispectral 1.2m 4-band",
        },
        {
          id: "bundle",
          label: "Bundle: Panchromatic 30cm + Multispectral 1.2m 4-band",
        },
        {
          id: "full_bundle",
          label: "Full Bundle: Panchromatic 30cm + Multispectral 1.2m 6-band",
        },
        {
          id: "full_pms",
          label: "Pansharpened 30cm 6-band",
        },
        {
          id: "full_ms",
          label: "Full MS: Multispectral 1.2m 6-band",
        },
        {
          id: "pansharpened_natural_color",
          label: "Pansharpened 30cm 3-band, Natural Color",
        },
        {
          id: "pansharpened_false_color",
          label: "Pansharpened 30cm 3-band, False Color",
        },
      ],
    },
  },
];

/**
 * Returns the spectral processing configuration for a product.
 */
export function getSpectralProcessing(
  productName?: string | null
): SpectralProcessing | null {
  if (!productName) return null;

  const name = productName.toLowerCase().replace(/\s+/g, "");

  const exactMatch = productData.find((product) => {
    const productNameNormalized = product.name
      .toLowerCase()
      .replace(/\s+/g, "");

    // Handle Pleiades 0.3
    if (product.name === "Pleiades 0.3") {
      return name.includes("pleiades") && name.includes("0.3");
    }

    // Handle Pleiades 0.5 / 50cm
    if (product.name === "Pleiades") {
      return (
        name.includes("pleiades") &&
        (name.includes("0.5") ||
          name.includes("50cm") ||
          (!name.includes("0.3") && !name.includes("30cm")))
      );
    }

    return name.includes(productNameNormalized);
  });

  return exactMatch?.spectral_processing ?? null;
}