import {
  coordinateIcon,
  pointIcon,
  polygonIcon,
  polylineIcon,
  selectionIcon,
} from "../../../../assets";

export interface DrawOption {
  id: "point" | "polyline" | "box" | "polygon" | "coordinates";
  label: string;
  icon: string;
  hasSettings: boolean;
  toolName: "Point" | "Polyline" | "Box" | "Polygon" | "Coordinates";
}

export const DRAW_OPTIONS: DrawOption[] = [
  {
    id: "point",
    label: "Point",
    icon: pointIcon,
    hasSettings: true,
    toolName: "Point",
  },
  {
    id: "polyline",
    label: "Polyline",
    icon: polylineIcon,
    hasSettings: true,
    toolName: "Polyline",
  },
  {
    id: "box",
    label: "Box/Rectangle",
    icon: selectionIcon,
    hasSettings: false,
    toolName: "Box",
  },
  {
    id: "polygon",
    label: "Polygon",
    icon: polygonIcon,
    hasSettings: false,
    toolName: "Polygon",
  },
  {
    id: "coordinates",
    label: "Coordinates",
    icon: coordinateIcon,
    hasSettings: true,
    toolName: "Coordinates",
  },
];
