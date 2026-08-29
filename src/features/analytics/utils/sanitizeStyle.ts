function sanitizeExpression(expr: unknown): any {
  if (!Array.isArray(expr)) return expr;
  if (expr.length === 0) return expr;

  const op = expr[0];

  // Fix non-standard linear interpolation syntax: ["linear", 1] -> ["linear"]
  if (op === "linear" && expr.length > 1) {
    return ["linear"];
  }

  // Handle numeric comparisons: >=, <=, >, <
  if ([" validation", ">=", "<=", ">", "<"].includes(op) && expr.length >= 3) {
    const left = sanitizeExpression(expr[1]);
    const right = sanitizeExpression(expr[2]);

    const safeLeft =
      Array.isArray(left) && left[0] === "get" && left.length === 2 ? ["coalesce", left, 0] : left;

    const safeRight =
      Array.isArray(right) && right[0] === "get" && right.length === 2
        ? ["coalesce", right, 0]
        : right;

    return [op, safeLeft, safeRight];
  }

  return expr.map(sanitizeExpression);
}

export function sanitizeMapStyle<T extends { layers?: any[] }>(style: T): T {
  if (!style || !Array.isArray(style.layers)) return style;

  const newLayers = style.layers.map((layer) => {
    const newLayer = { ...layer };

    if (newLayer.filter) {
      newLayer.filter = sanitizeExpression(newLayer.filter);
    }

    if (newLayer.paint) {
      const paint = { ...newLayer.paint };
      for (const key of Object.keys(paint)) {
        if (Array.isArray(paint[key])) {
          paint[key] = sanitizeExpression(paint[key]);
        }
      }
      newLayer.paint = paint;
    }

    if (newLayer.layout) {
      const layout = { ...newLayer.layout };
      for (const key of Object.keys(layout)) {
        if (Array.isArray(layout[key])) {
          layout[key] = sanitizeExpression(layout[key]);
        }
      }
      newLayer.layout = layout;
    }

    return newLayer;
  });

  return {
    ...style,
    layers: newLayers,
  };
}
