const images = new Map();
const textAlignments = ['left', 'center', 'right'];
let measureContext;

const colorCSS = (argb, alpha = 1) => `rgba(${argb >>> 16 & 255}, ${argb >>> 8 & 255}, ${argb & 255}, ${alpha})`;

function font(size, family, style) {
  const weight = family === 'sans-serif-medium' ? 500 : style >= 1 ? 700 : 400;
  const faces = family === 'sans-serif-condensed' ? '"Arial Narrow", sans-serif' : 'system-ui, sans-serif';
  return `${style === 3 ? 'italic ' : ''}${weight} ${size}px ${faces}`;
}

export async function decodeArtwork() {
  await Promise.all([...images.values()].map((image) => image.decode()));
}

// TeaVM's graphics classes call this adapter. The artwork, geometry and animation
// timeline still belong to PetTrampolineArt and PetMagicVfx.
globalThis.MaroSTGCanvas = {
  image(path) {
    let image = images.get(path);
    if (image) return image;
    image = new Image();
    image.src = path.startsWith('pet/')
      ? new URL('./art/' + path.slice(4), import.meta.url).href
      : new URL('../' + path.slice(4), import.meta.url).href;
    images.set(path, image);
    return image;
  },
  drawImage(ctx, image, x, y, width, height, alpha) {
    if (!image.complete || !image.naturalWidth || width <= 0 || height <= 0 || !alpha) return;
    ctx.globalAlpha = alpha / 255;
    ctx.drawImage(image, x, y, width, height);
  },
  addStop(gradient, offset, argb) {
    gradient.addColorStop(offset, colorCSS(argb, (argb >>> 24) / 255));
  },
  paint(ctx, argb, alpha, width, roundedCap, roundedJoin, shader) {
    ctx.globalAlpha = alpha / 255;
    ctx.fillStyle = ctx.strokeStyle = shader || colorCSS(argb);
    ctx.lineWidth = width > 0 ? width : 1;
    ctx.lineCap = roundedCap ? 'round' : 'butt';
    ctx.lineJoin = roundedJoin ? 'round' : 'miter';
  },
  rect(ctx, x, y, w, h, rx, ry, stroke) {
    if (w <= 0 || h <= 0) return;
    ctx.beginPath();
    if (rx > 0 && ry > 0) ctx.roundRect(x, y, w, h, { x: rx, y: ry });
    else ctx.rect(x, y, w, h);
    if (stroke) ctx.stroke();
    else ctx.fill();
  },
  text(ctx, value, x, y, size, family, style, align, stroke) {
    ctx.font = font(size, family, style);
    ctx.textAlign = textAlignments[align];
    ctx.textBaseline = 'alphabetic';
    if (stroke) ctx.strokeText(value, x, y);
    else ctx.fillText(value, x, y);
  },
  measure(value, size, family, style) {
    measureContext ??= document.createElement('canvas').getContext('2d');
    measureContext.font = font(size, family, style);
    return measureContext.measureText(value).width;
  },
};
