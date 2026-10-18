import { palette } from '../vi/palette.js';
import { capturePointcloud, onPointcloudFrame } from './pointcloud.js';

// Zoom into actual white ink, rather than the empty centre of the text box.
// Geometry is measured only after a font/language/viewport change, never per frame.
export function createHomeZoom(home) {
  const hello = home.querySelector('.hello');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const frame = document.createElement('canvas');
  frame.className = 'home-zoom-frame';
  frame.setAttribute('aria-hidden', 'true');
  home.after(frame);
  const paint = frame.getContext('2d', { alpha: false });
  const cloudFrame = document.createElement('canvas');
  const cloudPaint = cloudFrame.getContext('2d', { alpha: false });
  let geometry, glyphs = [], chrome = [];
  let dirty = true, active = false, lastProgress = -1, dpr = 1;

  onPointcloudFrame(source => {
    if (!active || !geometry) return;
    cloudPaint.drawImage(source, 0, 0, cloudFrame.width, cloudFrame.height);
    draw(lastProgress);
  });

  function measureText(element) {
    const source = element.querySelector('.scramble-source') || element;
    const text = source.firstChild;
    if (text?.nodeType !== Node.TEXT_NODE) return [];
    const homeBox = home.getBoundingClientRect();
    const style = getComputedStyle(element);
    const baseline = document.createElement('span');
    baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    source.append(baseline);
    const y = baseline.getBoundingClientRect().top - homeBox.top;
    baseline.remove();
    let offset = 0;
    return Array.from(text.textContent).map(character => {
      const range = document.createRange();
      range.setStart(text, offset);
      offset += character.length;
      range.setEnd(text, offset);
      return { character, x: range.getBoundingClientRect().left - homeBox.left, y,
        font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
        color: style.color };
    });
  }

  function capture() {
    if (!geometry) return;
    // Canvas backing stores stay at viewport size, irrespective of zoom scale.
    capturePointcloud(cloudPaint, cloudFrame.width, cloudFrame.height);
  }

  function measure() {
    const source = hello.querySelector('.scramble-source') || hello;
    const text = source.firstChild;
    if (text?.nodeType !== Node.TEXT_NODE) {
      return;
    }
    const characters = Array.from(text.textContent);
    const index = characters[0] === 'H' ? 2 : 1;
    const character = characters[index] || characters[0];
    const start = characters.slice(0, index).join('').length;
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + character.length);
    const glyphBox = range.getBoundingClientRect();
    const homeBox = home.getBoundingClientRect();
    // An empty inline box exposes the DOM's real baseline, including CJK fallback.
    const baseline = document.createElement('span');
    baseline.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;vertical-align:baseline';
    hello.append(baseline);
    const baselineY = baseline.getBoundingClientRect().top;
    baseline.remove();

    const style = getComputedStyle(hello);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.font = font;
    const ink = context.measureText(character);
    const padding = 4;
    canvas.width = Math.ceil(ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight) + padding * 2;
    canvas.height = Math.ceil(ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent) + padding * 2;
    context.font = font;
    context.fillStyle = palette.surface;
    context.fillText(character, padding + ink.actualBoundingBoxLeft, padding + ink.actualBoundingBoxAscent);
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    const distances = new Uint16Array(width * height);
    // A two-pass chessboard distance gives the largest fully opaque square.
    // Its inset remains white at every viewport corner at the final scale.
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (pixels[i * 4 + 3] < 254) continue;
        distances[i] = 1 + Math.min(distances[i - 1], distances[i - width - 1], distances[i - width], distances[i - width + 1]);
      }
    }
    let best = { score: -Infinity, x: 0, y: 0, radius: 0 };
    for (let y = height - 2; y > 0; y--) {
      for (let x = width - 2; x > 0; x--) {
        const i = y * width + x;
        if (!distances[i]) continue;
        const radius = distances[i] = Math.min(distances[i], 1 + Math.min(distances[i + 1], distances[i + width - 1], distances[i + width], distances[i + width + 1]));
        const score = radius - Math.hypot(x - width / 2, y - height / 2) * .02;
        if (score > best.score) best = { score, x, y, radius };
      }
    }
    geometry = {
      x: glyphBox.left - homeBox.left - ink.actualBoundingBoxLeft + best.x + .5 - padding,
      y: baselineY - homeBox.top - ink.actualBoundingBoxAscent + best.y + .5 - padding,
      width: home.clientWidth,
      height: home.clientHeight,
      // Keep an antialiasing margin, then travel beyond the last visible edge.
      scale: Math.max(home.clientWidth, home.clientHeight) / (2 * Math.max(1, best.radius - 2)) * 1.22,
    };
    dpr = Math.min(devicePixelRatio || 1, 2);
    frame.width = cloudFrame.width = Math.ceil(geometry.width * dpr);
    frame.height = cloudFrame.height = Math.ceil(geometry.height * dpr);
    glyphs = [...home.querySelectorAll('.hello,.name')].flatMap(measureText);
    chrome = [...home.querySelectorAll('.languages button,#explore-label')].flatMap(measureText);
    capture();
    dirty = false;
    lastProgress = -1;
  }

  function draw(progress) {
    const zoom = Math.min(1, progress / .76);
    const scale = Math.exp(Math.log(geometry.scale) * zoom ** 1.45);
    const centre = Math.min(1, zoom / .65);
    const pan = centre * centre * (3 - 2 * centre);
    const x = (geometry.width / 2 - geometry.x) * pan;
    const y = (geometry.height / 2 - geometry.y) * pan;
    paint.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint.fillStyle = palette['site-background'];
    paint.fillRect(0, 0, geometry.width, geometry.height);
    paint.translate(geometry.x + x, geometry.y + y);
    paint.scale(scale, scale);
    paint.translate(-geometry.x, -geometry.y);
    paint.drawImage(cloudFrame, 0, 0, geometry.width, geometry.height);
    for (const glyph of glyphs) {
      paint.font = glyph.font;
      paint.fillStyle = glyph.color;
      paint.fillText(glyph.character, glyph.x, glyph.y);
    }
    paint.globalAlpha = Math.max(0, 1 - progress / .16);
    for (const glyph of chrome) {
      paint.font = glyph.font;
      paint.fillStyle = glyph.color;
      paint.fillText(glyph.character, glyph.x, glyph.y);
    }
    paint.globalAlpha = 1;
  }

  return {
    invalidate() { dirty = true; },
    prepare() {
      measure();
      if (geometry) draw(0); // Warm the text and image drawing path before input.
    },
    render(progress, reduced) {
      if (reduced || !geometry) { frame.style.opacity = 0; active = false; return false; }
      const visible = progress > 0 && progress < .76;
      if (visible) {
        if (dirty) measure();
        if (!active && lastProgress <= 0) capture();
        if (progress !== lastProgress) draw(progress);
      }
      frame.style.opacity = visible ? 1 : 0;
      active = visible;
      lastProgress = progress;
      return visible;
    },
  };
}
