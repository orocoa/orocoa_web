import * as THREE from "/home/vendor/three.module.js";


const load = (src, priority) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // Must be set before src or the request is already away.
    if (priority) img.fetchPriority = priority;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });

/**
 * Packs every image into one texture. A single atlas rather than one texture
 * per plane because ESSL 1.00 cannot index an array of samplers with a
 * non-constant index.
 *
 * Returns synchronously with the sheet blank and filling in as images arrive:
 * the caller needs something to bind on frame one, and the entry shows its seed
 * while the rest are still coming.
 *
 * `first` settles once the selected seed is on the texture, `ready` once all are.
 * Neither rejects — a missing file leaves its cell blank and still counts as
 * settled, so one bad path cannot strand the entry.
 */
export function buildAtlas(files, onProgress, { contain = false, surface, cellWidth = 512, maxTextureSize = 16384, seedIndex = 0 } = {}) {
  const cols = Math.ceil(Math.sqrt(files.length));
  const rows = Math.ceil(files.length / cols);
  // Retina desktop cards need more than the old 512px texture. Keep the
  // phone budget and respect the actual GPU limit for the complete sheet.
  const CELL_W = Math.max(1, Math.min(cellWidth, Math.floor(maxTextureSize / cols),
    Math.floor(Math.floor(maxTextureSize / rows) * 1.5)));
  const CELL_H = Math.max(1, Math.round(CELL_W / 1.5));

  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL_W;
  canvas.height = rows * CELL_H;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  // The shader flips each cell itself, so leave the sheet as drawn.
  texture.flipY = false;
  // NoColorSpace deliberately: this shader writes straight to the framebuffer
  // with no encoding step, and decoding on read without encoding on write is
  // what washes everything out.
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  const paint = (img, i) => {
    const x = (i % cols) * CELL_W;
    const y = Math.floor(i / cols) * CELL_H;

    // Keep the default cover fit; selected artwork can preserve its full frame.
    const containCell = Array.isArray(contain) ? contain[i] : contain;
    const scale = (containCell ? Math.min : Math.max)(CELL_W / img.width, CELL_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, CELL_W, CELL_H); // clip, or an oversized image bleeds
    ctx.clip();
    if (surface) { ctx.fillStyle = surface; ctx.fillRect(x, y, CELL_W, CELL_H); }
    ctx.drawImage(img, x + (CELL_W - dw) / 2, y + (CELL_H - dh) / 2, dw, dh);
    ctx.restore();
  };

  let settled = 0;
  const tick = () => onProgress?.(settled / files.length);

  const fetchInto = (i, priority) =>
    load(files[i], priority)
      .then((img) => paint(img, i))
      .catch((err) => console.warn("[atlas]", err.message))
      .finally(() => {
        settled++;
        tick();
      });

  // The selected seed is the only artwork on screen during the hold. Ask for
  // it ahead of the rest and upload the moment it lands.
  const first = fetchInto(seedIndex, "high").then(() => {
    texture.needsUpdate = true;
  });

  // One upload at the end for everything else. Marking dirty per image would
  // re-send the whole sheet eighteen times for cells nobody is looking at yet.
  const ready = Promise.all([
    first,
    ...files.flatMap((_, i) => i === seedIndex ? [] : [fetchInto(i, "low")]),
  ]).then(() => {
    texture.needsUpdate = true;
  });

  tick();
  return { texture, grid: [cols, rows], cellSize: [CELL_W, CELL_H], count: files.length, first, ready };
}
