import { PNG } from "pngjs";

export function rgbaToDataURL(rgba: Uint8Array, width: number, height: number): string {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  const buffer = PNG.sync.write(png);
  const base64 = buffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

export function rgbaToPngBytes(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);

  const buffer = PNG.sync.write(png);

  return new Uint8Array(buffer);
}
