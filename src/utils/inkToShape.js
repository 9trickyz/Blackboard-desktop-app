/**
 * Stroke geometric analysis for Ink-to-Shape recognition.
 * Recognizes Circles, Rectangles, Triangles, Lines, Arrows, and Stars.
 */

function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

function getBoundingBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    sumX += p.x;
    sumY += p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: sumX / points.length,
    centerY: sumY / points.length
  };
}

// Resample points evenly along stroke
function resample(points, n = 40) {
  if (points.length < 2) return points;
  const totalLength = getPathLength(points);
  if (totalLength <= 0) return points;
  const interval = totalLength / (n - 1);
  const resampled = [points[0]];
  let currentDist = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const d = distance(p1, p2);

    if (currentDist + d >= interval) {
      const t = (interval - currentDist) / d;
      const nx = p1.x + t * (p2.x - p1.x);
      const ny = p1.y + t * (p2.y - p1.y);
      const np = { x: nx, y: ny };
      resampled.push(np);
      currentDist = 0;
      points.splice(i, 0, np);
    } else {
      currentDist += d;
    }
  }

  while (resampled.length < n) {
    resampled.push(points[points.length - 1]);
  }
  return resampled;
}

// Find corner turns based on angle deviation
function detectCorners(points, angleThreshold = 45) {
  const corners = [];
  const step = 2;
  for (let i = step; i < points.length - step; i++) {
    const pPrev = points[i - step];
    const pCurr = points[i];
    const pNext = points[i + step];

    const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 * mag2 > 0) {
      const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      const angle = (Math.acos(cosAngle) * 180) / Math.PI;
      // Acute or right angle turn
      if (angle < 180 - angleThreshold) {
        // Suppress close consecutive corners
        if (corners.length === 0 || distance(points[corners[corners.length - 1]], pCurr) > 15) {
          corners.push(i);
        }
      }
    }
  }
  return corners;
}

export function recognizeStroke(rawPoints) {
  if (!rawPoints || rawPoints.length < 8) {
    return { recognized: false };
  }

  const bbox = getBoundingBox(rawPoints);
  const totalLength = getPathLength(rawPoints);
  if (totalLength < 25) {
    return { recognized: false };
  }

  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  const closeDist = distance(first, last);
  const isClosed = closeDist < Math.max(35, totalLength * 0.22);

  const resampled = resample([...rawPoints], 40);
  const corners = detectCorners(resampled);

  // 1. Straight Line Check
  const directDist = distance(first, last);
  const straightness = directDist / totalLength;
  if (!isClosed && straightness > 0.88) {
    return {
      recognized: true,
      shapeType: 'line',
      x1: first.x,
      y1: first.y,
      x2: last.x,
      y2: last.y,
      bounds: bbox
    };
  }

  // 2. Closed Shapes (Circle, Rectangle, Triangle)
  if (isClosed) {
    // Check Circle: radial distance standard deviation from center
    let radSum = 0;
    const radii = resampled.map(p => {
      const r = distance(p, { x: bbox.centerX, y: bbox.centerY });
      radSum += r;
      return r;
    });
    const avgR = radSum / resampled.length;
    let variance = 0;
    for (const r of radii) {
      variance += Math.pow(r - avgR, 2);
    }
    const stdDev = Math.sqrt(variance / resampled.length);
    const circularity = stdDev / avgR;

    const aspectRatio = bbox.width / (bbox.height || 1);

    if (circularity < 0.22 && aspectRatio > 0.65 && aspectRatio < 1.55) {
      const radius = Math.max(bbox.width, bbox.height) / 2;
      return {
        recognized: true,
        shapeType: 'circle',
        x: bbox.centerX - radius,
        y: bbox.centerY - radius,
        width: radius * 2,
        height: radius * 2,
        bounds: bbox
      };
    }

    // Check Triangle (3 corners)
    if (corners.length >= 2 && corners.length <= 4) {
      return {
        recognized: true,
        shapeType: 'triangle',
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height,
        bounds: bbox
      };
    }

    // Check Rectangle (4 corners or box-like aspect ratio)
    if (corners.length >= 3 && corners.length <= 6) {
      return {
        recognized: true,
        shapeType: 'rectangle',
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height,
        bounds: bbox
      };
    }
  }

  // 3. Arrow Recognition (Open line with head)
  if (!isClosed && corners.length >= 1 && corners.length <= 3) {
    // If the path resembles an arrow stem + head
    const cornerIndex = corners[corners.length - 1];
    if (cornerIndex > resampled.length * 0.65) {
      return {
        recognized: true,
        shapeType: 'arrow',
        x1: first.x,
        y1: first.y,
        x2: resampled[cornerIndex].x,
        y2: resampled[cornerIndex].y,
        bounds: bbox
      };
    }
  }

  return { recognized: false };
}
