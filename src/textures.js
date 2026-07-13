import * as THREE from "three";

/** Small soft radial-gradient blob used as a cheap fake-AO/contact-shadow decal. */
export function createSoftShadowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.45)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vertical sky gradient (zenith blue -> warm horizon) rendered onto a tall canvas. */
export function createSkyGradientTexture() {
  const w = 2;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#3f8fc4");
  gradient.addColorStop(0.55, "#6fb3da");
  gradient.addColorStop(0.82, "#bfe0e8");
  gradient.addColorStop(1, "#f3e6c4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}
