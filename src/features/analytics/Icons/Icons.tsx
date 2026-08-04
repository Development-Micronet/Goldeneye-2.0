/**
 * Minimal stroke icon set. Inline SVG keeps the bundle free of an icon
 * dependency and lets every glyph inherit `currentColor`.
 */
import type { JSX } from "react";

export type IconName =
    | "layers" | "globe" | "stack" | "search" | "locate" | "target" | "trash"
    | "eye" | "eye-off" | "plus" | "ruler" | "polygon" | "circle" | "square"
    | "line" | "point" | "pointer" | "north" | "home" | "sun" | "moon" | "close"
    | "info" | "download" | "mountain" | "building" | "chevron-left" | "chevron-right"
    | "grip" | "map";

const PATHS: Record<IconName, JSX.Element> = {
    layers: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
    stack: <><rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="14" width="18" height="6" rx="1" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v3M12 20v3M1 12h3M20 12h3" /></>,
    target: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></>,
    trash: <><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    "eye-off": <><path d="M4 4l16 16" /><path d="M9.5 6.4A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.3 8.3C3.7 9.9 2 12 2 12s3.5 6 10 6a9.7 9.7 0 0 0 3.2-.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    ruler: <><path d="m3 16 13-13 5 5-13 13-5-5Z" /><path d="m7 12 2 2M10 9l2 2M13 6l2 2" /></>,
    polygon: <><path d="m12 3 8 6-3 10H7L4 9l8-6Z" /></>,
    circle: <><circle cx="12" cy="12" r="8" /></>,
    square: <><rect x="4" y="4" width="16" height="16" rx="1" /></>,
    line: <><path d="M4 19 20 5" /><circle cx="4" cy="19" r="2" /><circle cx="20" cy="5" r="2" /></>,
    point: <><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
    pointer: <><path d="m5 3 6 17 2.5-7L20 10 5 3Z" /></>,
    north: <><path d="m12 2 3.5 9L12 9l-3.5 2L12 2Z" /><path d="M12 11v11" /></>,
    home: <><path d="m3 11 9-7 9 7" /><path d="M6 10v10h12V10" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
    moon: <><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></>,
    close: <><path d="M5 5l14 14M19 5 5 19" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    download: <><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
    mountain: <><path d="m3 19 6-11 4 6 2-3 6 8H3Z" /></>,
    building: <><path d="M4 21V7l7-4v18M11 21V10l7 3v8" /><path d="M2 21h20" /></>,
    "chevron-left": <><path d="m14 6-6 6 6 6" /></>,
    "chevron-right": <><path d="m10 6 6 6-6 6" /></>,
    grip: <><circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" /></>,
};

export interface IconProps {
    name: IconName;
    size?: number;
    title?: string;
}

export function Icon({ name, size = 16, title }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={title ? undefined : true}
            role={title ? "img" : undefined}
            focusable="false"
        >
            {title ? <title>{title}</title> : null}
            {PATHS[name]}
        </svg>
    );
}