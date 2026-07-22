export interface ProductResponse {
  success: boolean;
  provider: string;
  type: "FeatureCollection";
  count: number;
  pagination: Pagination;
  features: ProductFeature[];
  length: number;
}

export interface Pagination {
  page: number;
  items_per_page: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ProductFeature {
  type: "Feature";
  id: string;
  bbox: number[] | null;
  geometry: ProductGeometry;
  properties: ProductProperties;
}

export interface ProductGeometry {
  type: string;
  coordinates: number[][][];
}

export interface ProductProperties {
  serial_no: number;
  product_id: string;
  date: string;
  cloud_cover: number;
  sensor: string;
  incidence_angle: number;
  image_url: string;
  thumbnail_url: string;
  quicklook_url: string;

  raw: ProductRawData;

  // allow future fields
  [key: string]: unknown;
}

export interface ProductRawData {
  acquisitionDate: string;
  acquisitionIdentifier: string;
  activityId: string;

  azimuthAngle: number;
  cloudCover: number;

  constellation: string;
  correlationId: string;

  expirationDate: string;
  format: string;

  geometryCentroid: GeometryCentroid;

  id: string;

  illuminationAzimuthAngle: number;
  illuminationElevationAngle: number;

  incidenceAngle: number;
  incidenceAngleAcrossTrack: number;
  incidenceAngleAlongTrack: number;

  lastUpdateDate: string;

  organisationName: string;
  platform: string;

  processingCenter: string;
  processingDate: string;
  processingLevel: string;
  processorName: string;

  productCategory: string;
  productType: string;
  productionStatus: string;

  publicationDate: string;

  qualified: boolean;

  resolution: number;

  sensorType: string;
  snowCover: number;

  spectralRange: string;

  title: string;

  workspaceId: string;
  workspaceName: string;
  workspaceTitle: string;

  // allow provider-specific metadata
  [key: string]: unknown;
}

export type GeometryCentroid =
  | {
      lat: number;
      lon: number;
    }
  | [number, number];
