import { jsPDF } from 'jspdf';

let measureCanvas = null;
let measureCtx = null;

export function getWrappedTextLines(text, fontSize = 16, fontStyleStr = '', maxWidth = null) {
  if (!text) return [];
  if (!maxWidth || maxWidth <= 0) {
    return text.split('\n');
  }
  if (typeof document !== 'undefined') {
    if (!measureCanvas) {
      measureCanvas = document.createElement('canvas');
      measureCtx = measureCanvas.getContext('2d');
    }
    measureCtx.font = fontStyleStr || `${fontSize}px Inter, sans-serif`;
  }

  const rawParagraphs = text.split('\n');
  const result = [];

  for (const para of rawParagraphs) {
    if (!para) {
      result.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      let testWidth = 0;
      if (measureCtx) {
        testWidth = measureCtx.measureText(testLine).width;
      } else {
        testWidth = testLine.length * fontSize * 0.6;
      }

      if (testWidth <= maxWidth || !currentLine) {
        // If a single word on its own is wider than maxWidth, break it into chunks
        if (!currentLine && testWidth > maxWidth && word.length > 1) {
          let remaining = word;
          while (remaining.length > 0) {
            let chunk = '';
            for (let c = 0; c < remaining.length; c++) {
              const testChunk = chunk + remaining[c];
              const w = measureCtx ? measureCtx.measureText(testChunk).width : testChunk.length * fontSize * 0.6;
              if (w > maxWidth && chunk.length > 0) break;
              chunk = testChunk;
            }
            if (chunk.length < remaining.length) {
              result.push(chunk);
              remaining = remaining.slice(chunk.length);
            } else {
              currentLine = chunk;
              break;
            }
          }
        } else {
          currentLine = testLine;
        }
      } else {
        result.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      result.push(currentLine);
    }
  }

  return result.length > 0 ? result : [''];
}

export function getElementsBoundingBox(elements, fallbackWidth = 1200, fallbackHeight = 800) {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: fallbackWidth, maxY: fallbackHeight, width: fallbackWidth, height: fallbackHeight };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    if (el.type === 'pen' && el.points) {
      for (const p of el.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    } else if (el.type === 'shape') {
      const x2 = el.x + el.width;
      const y2 = el.y + el.height;
      if (el.x < minX) minX = el.x;
      if (x2 > maxX) maxX = x2;
      if (el.y < minY) minY = el.y;
      if (y2 > maxY) maxY = y2;
    } else if (el.type === 'line') {
      if (el.x1 < minX) minX = el.x1;
      if (el.x2 > maxX) maxX = el.x2;
      if (el.y1 < minY) minY = el.y1;
      if (el.y2 > maxY) maxY = y2;
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 16;
      const fontStyle = el.italic ? 'italic ' : '';
      const fontWeight = el.bold ? 'bold ' : 'normal ';
      const font = `${fontStyle}${fontWeight}${fontSize}px Inter, sans-serif`;
      const lines = getWrappedTextLines(el.text, fontSize, font, el.width);
      let maxLineWidth = 0;
      if (typeof document !== 'undefined') {
        if (!measureCanvas) {
          measureCanvas = document.createElement('canvas');
          measureCtx = measureCanvas.getContext('2d');
        }
        measureCtx.font = font;
        for (const l of lines) {
          const w = measureCtx.measureText(l).width;
          if (w > maxLineWidth) maxLineWidth = w;
        }
      } else {
        maxLineWidth = Math.max(...lines.map(l => l.length * fontSize * 0.62), 60);
      }
      const boxWidth = el.width ? Math.max(el.width, 60) : Math.max(maxLineWidth, 60);
      const approxHeight = Math.max(1, lines.length) * fontSize * 1.35;
      if (el.x < minX) minX = el.x;
      if (el.x + boxWidth > maxX) maxX = el.x + boxWidth;
      if (el.y - fontSize < minY) minY = el.y - fontSize;
      if (el.y - fontSize + approxHeight > maxY) maxY = el.y - fontSize + approxHeight;
    } else if (el.type === 'image') {
      if (el.x < minX) minX = el.x;
      if (el.x + el.width > maxX) maxX = el.x + el.width;
      if (el.y < minY) minY = el.y;
      if (el.y + el.height > maxY) maxY = el.y + el.height;
    }
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: fallbackWidth, maxY: fallbackHeight, width: fallbackWidth, height: fallbackHeight };
  }

  const padding = 50;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: (maxX - minX) + padding * 2,
    height: (maxY - minY) + padding * 2
  };
}

export function drawShapeToContext(ctx, shape) {
  ctx.save();
  const { x, y, width, height, shapeType, rotation = 0 } = shape;

  // Rotation around element center
  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  ctx.strokeStyle = shape.strokeColor || '#ffffff';
  ctx.lineWidth = shape.strokeWidth || 3;
  ctx.fillStyle = shape.fillColor || 'transparent';
  ctx.globalAlpha = (shape.opacity !== undefined ? shape.opacity : 100) / 100;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  if (shapeType === 'rectangle') {
    ctx.rect(x, y, width, height);
  } else if (shapeType === 'rounded_rect') {
    const r = Math.min(16, width / 4, height / 4);
    ctx.roundRect ? ctx.roundRect(x, y, width, height, r) : ctx.rect(x, y, width, height);
  } else if (shapeType === 'circle') {
    const rx = width / 2;
    const ry = height / 2;
    ctx.ellipse(x + rx, y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
  } else if (shapeType === 'triangle') {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  } else if (shapeType === 'diamond') {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, y + height / 2);
    ctx.closePath();
  } else if (shapeType === 'hexagon') {
    const w = width;
    const h = height;
    ctx.moveTo(x + w * 0.25, y);
    ctx.lineTo(x + w * 0.75, y);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w * 0.75, y + h);
    ctx.lineTo(x + w * 0.25, y + h);
    ctx.lineTo(x, y + h * 0.5);
    ctx.closePath();
  } else if (shapeType === 'star') {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const spikes = 5;
    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius * 0.45;
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let sx = cx + Math.cos(rot) * outerRadius;
      let sy = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(sx, sy);
      rot += step;

      sx = cx + Math.cos(rot) * innerRadius;
      sy = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(sx, sy);
      rot += step;
    }
    ctx.closePath();
  } else if (shapeType === 'heart') {
    const topCurveHeight = height * 0.3;
    ctx.moveTo(x + width / 2, y + height / 5);
    ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y + (height + topCurveHeight) / 2, x + width / 2, y + (height + topCurveHeight) / 1.4, x + width / 2, y + height);
    ctx.bezierCurveTo(x + width / 2, y + (height + topCurveHeight) / 1.4, x + width, y + (height + topCurveHeight) / 2, x + width, y + topCurveHeight);
    ctx.bezierCurveTo(x + width, y, x + width / 2, y, x + width / 2, y + height / 5);
    ctx.closePath();
  } else if (shapeType === 'speech_bubble') {
    const r = Math.min(16, width / 6, height / 6);
    const bubbleH = height * 0.8;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + bubbleH - r);
    ctx.quadraticCurveTo(x + width, y + bubbleH, x + width - r, y + bubbleH);
    ctx.lineTo(x + width * 0.45, y + bubbleH);
    ctx.lineTo(x + width * 0.25, y + height);
    ctx.lineTo(x + width * 0.3, y + bubbleH);
    ctx.lineTo(x + r, y + bubbleH);
    ctx.quadraticCurveTo(x, y + bubbleH, x, y + bubbleH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  } else if (shapeType === 'arrow') {
    const headLen = Math.min(width * 0.35, 30);
    const shaftHeight = height * 0.3;
    ctx.moveTo(x, y + (height - shaftHeight) / 2);
    ctx.lineTo(x + width - headLen, y + (height - shaftHeight) / 2);
    ctx.lineTo(x + width - headLen, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width - headLen, y + height);
    ctx.lineTo(x + width - headLen, y + (height + shaftHeight) / 2);
    ctx.lineTo(x, y + (height + shaftHeight) / 2);
    ctx.closePath();
  }

  if (shape.fillColor && shape.fillColor !== 'transparent') {
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

export function drawLineToContext(ctx, line) {
  ctx.save();
  const { x1, y1, x2, y2, rotation = 0 } = line;

  if (rotation) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  ctx.strokeStyle = line.strokeColor || '#ffffff';
  ctx.lineWidth = line.strokeWidth || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = (line.opacity !== undefined ? line.opacity : 100) / 100;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  if (line.isArrow) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 16 + (line.strokeWidth || 3);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPenStrokeToContext(ctx, el) {
  if (!el.points || el.points.length < 2) return;
  ctx.save();

  if (el.rotation) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of el.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    ctx.translate(cx, cy);
    ctx.rotate(el.rotation);
    ctx.translate(-cx, -cy);
  }

  ctx.strokeStyle = el.strokeColor || '#ffffff';
  ctx.lineWidth = el.strokeWidth || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = (el.opacity !== undefined ? el.opacity : 100) / 100;

  ctx.beginPath();
  ctx.moveTo(el.points[0].x, el.points[0].y);
  for (let i = 1; i < el.points.length; i++) {
    const p1 = el.points[i - 1];
    const p2 = el.points[i];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
  }
  ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

export function drawTextToContext(ctx, el) {
  if (!el.text || !el.text.trim()) return;
  ctx.save();
  const fontStyle = el.italic ? 'italic ' : '';
  const fontWeight = el.bold ? 'bold ' : 'normal ';
  const fontSize = el.fontSize || 16;
  ctx.font = `${fontStyle}${fontWeight}${fontSize}px Inter, sans-serif`;

  const lines = getWrappedTextLines(el.text, fontSize, ctx.font, el.width);
  const lineHeight = fontSize * 1.35;
  const totalHeight = Math.max(1, lines.length) * lineHeight;

  let maxLineWidth = 0;
  for (const l of lines) {
    const w = ctx.measureText(l).width;
    if (w > maxLineWidth) maxLineWidth = w;
  }
  const boxWidth = el.width ? Math.max(el.width, 60) : Math.max(maxLineWidth, 60);

  if (el.rotation) {
    const cx = el.x + boxWidth / 2;
    const cy = el.y - fontSize + totalHeight / 2;
    ctx.translate(cx, cy);
    ctx.rotate(el.rotation);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = el.color || '#ffffff';
  ctx.globalAlpha = (el.opacity !== undefined ? el.opacity : 100) / 100;

  const align = el.align || 'left';

  for (let i = 0; i < lines.length; i++) {
    const lineY = el.y + i * lineHeight;
    const lineWidth = ctx.measureText(lines[i]).width;
    let lineX = el.x;
    if (align === 'center') {
      lineX = el.x + (boxWidth - lineWidth) / 2;
    } else if (align === 'right') {
      lineX = el.x + (boxWidth - lineWidth);
    }
    ctx.fillText(lines[i], lineX, lineY);

    if (el.strikethrough) {
      ctx.beginPath();
      ctx.strokeStyle = el.color || '#ffffff';
      ctx.lineWidth = Math.max(1.5, fontSize / 12);
      ctx.moveTo(lineX, lineY - fontSize * 0.35);
      ctx.lineTo(lineX + lineWidth, lineY - fontSize * 0.35);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function hydrateElements(elements) {
  if (!elements || !Array.isArray(elements)) return [];
  return elements.map(el => {
    if (el.type === 'image' && el.src) {
      const isRealImage =
        el.imgElement &&
        typeof el.imgElement === 'object' &&
        el.imgElement instanceof HTMLImageElement &&
        el.imgElement.src;
      if (!isRealImage) {
        const img = new Image();
        img.src = el.src;
        return { ...el, imgElement: img };
      }
    }
    return el;
  });
}

export function drawImageToContext(ctx, el) {
  const isRealImage =
    el.imgElement &&
    typeof el.imgElement === 'object' &&
    el.imgElement instanceof HTMLImageElement &&
    el.imgElement.src;

  if (!isRealImage && el.src) {
    const img = new Image();
    img.src = el.src;
    el.imgElement = img;
  }
  if (el.imgElement && el.imgElement.complete && el.imgElement.naturalWidth > 0) {
    ctx.save();
    if (el.rotation) {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(el.rotation);
      ctx.translate(-cx, -cy);
    }
    ctx.globalAlpha = (el.opacity !== undefined ? el.opacity : 100) / 100;
    ctx.drawImage(el.imgElement, el.x, el.y, el.width, el.height);
    ctx.restore();
  }
}

export async function exportBoard({ elements, exportSettings, viewTransform, canvasDimensions, title = 'Blackboard' }) {
  const format = (exportSettings?.format || 'PNG').toUpperCase();
  const multiplier = Number(exportSettings?.multiplier || 1);
  const transparentBg = Boolean(exportSettings?.transparentBg);
  const cropToContent = exportSettings?.cropToContent !== false && exportSettings?.framing === 'crop';

  const bounds = cropToContent
    ? getElementsBoundingBox(elements, canvasDimensions.width, canvasDimensions.height)
    : {
        minX: -viewTransform.x / viewTransform.scale,
        minY: -viewTransform.y / viewTransform.scale,
        width: canvasDimensions.width / viewTransform.scale,
        height: canvasDimensions.height / viewTransform.scale
      };

  const exportW = Math.max(200, Math.round(bounds.width * multiplier));
  const exportH = Math.max(200, Math.round(bounds.height * multiplier));

  if (format === 'SVG') {
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}" width="${exportW}" height="${exportH}">\n`;
    if (!transparentBg) {
      svgContent += `  <rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="#16171a"/>\n`;
    }
    for (const el of elements) {
      const rotAttr = el.rotation ? ` transform="rotate(${(el.rotation * 180 / Math.PI).toFixed(1)} ${el.x + (el.width || 0) / 2} ${el.y + (el.height || 0) / 2})"` : '';
      if (el.type === 'shape') {
        const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none';
        const stroke = el.strokeColor || '#ffffff';
        const sw = el.strokeWidth || 3;
        const op = (el.opacity || 100) / 100;
        if (el.shapeType === 'rectangle') {
          svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"${rotAttr}/>\n`;
        } else if (el.shapeType === 'circle') {
          svgContent += `  <ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"${rotAttr}/>\n`;
        }
      } else if (el.type === 'line') {
        svgContent += `  <line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.strokeColor || '#fff'}" stroke-width="${el.strokeWidth || 3}" opacity="${(el.opacity || 100) / 100}"/>\n`;
      } else if (el.type === 'pen' && el.points && el.points.length > 1) {
        let d = `M ${el.points[0].x} ${el.points[0].y}`;
        for (let i = 1; i < el.points.length; i++) {
          d += ` L ${el.points[i].x} ${el.points[i].y}`;
        }
        svgContent += `  <path d="${d}" fill="none" stroke="${el.strokeColor || '#fff'}" stroke-width="${el.strokeWidth || 4}" stroke-linecap="round" stroke-linejoin="round" opacity="${(el.opacity || 100) / 100}"/>\n`;
      } else if (el.type === 'text') {
        const fontSize = el.fontSize || 16;
        const fontStyle = el.italic ? 'italic ' : '';
        const fontWeight = el.bold ? 'bold ' : 'normal ';
        const font = `${fontStyle}${fontWeight}${fontSize}px Inter, sans-serif`;
        const lines = getWrappedTextLines(el.text, fontSize, font, el.width);
        const lineHeight = fontSize * 1.35;
        const boxWidth = el.width || 60;
        const align = el.align || 'left';
        const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
        const textX = align === 'center' ? el.x + boxWidth / 2 : align === 'right' ? el.x + boxWidth : el.x;

        const escapeXml = (str) => (str || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]));
        svgContent += `  <text x="${textX}" y="${el.y}" text-anchor="${anchor}" fill="${el.color || '#fff'}" font-size="${fontSize}" font-family="Inter, sans-serif" opacity="${(el.opacity || 100) / 100}"${rotAttr}>\n`;
        lines.forEach((line, idx) => {
          svgContent += `    <tspan x="${textX}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>\n`;
        });
        svgContent += `  </text>\n`;
      }
    }
    svgContent += `</svg>`;

    triggerDownload(`${title}.svg`, 'image/svg+xml;charset=utf-8', svgContent);
    return;
  }

  // PNG or PDF
  const offCanvas = document.createElement('canvas');
  offCanvas.width = exportW;
  offCanvas.height = exportH;
  const offCtx = offCanvas.getContext('2d');

  if (!transparentBg) {
    const bgGrad = offCtx.createLinearGradient(0, 0, exportW, exportH);
    bgGrad.addColorStop(0, '#1c1e23');
    bgGrad.addColorStop(0.5, '#16171a');
    bgGrad.addColorStop(1, '#111215');
    offCtx.fillStyle = bgGrad;
    offCtx.fillRect(0, 0, exportW, exportH);
  }

  offCtx.save();
  offCtx.scale(multiplier, multiplier);
  offCtx.translate(-bounds.minX, -bounds.minY);

  for (const el of elements) {
    if (el.type === 'pen') drawPenStrokeToContext(offCtx, el);
    else if (el.type === 'shape') drawShapeToContext(offCtx, el);
    else if (el.type === 'line') drawLineToContext(offCtx, el);
    else if (el.type === 'text') drawTextToContext(offCtx, el);
    else if (el.type === 'image') drawImageToContext(offCtx, el);
  }
  offCtx.restore();

  if (format === 'PDF') {
    const orientation = exportW >= exportH ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [exportW, exportH]
    });
    const imgData = offCanvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, exportW, exportH);
    pdf.save(`${title}.pdf`);
  } else {
    offCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }
}

function triggerDownload(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
