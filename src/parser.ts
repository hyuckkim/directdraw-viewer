import { parseDDS } from "./parsedds";
import { decodeDXT } from "./decoder";

export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array; // RGBA8 pixel data
}

export function ddsToRGBAArray(buffer: Uint8Array): RGBAImage[] {
  try {   
    const info = parseDDS(buffer);
    const { format, images } = info;

    const results: RGBAImage[] = [];

    for (const img of images) {
      const {width, height} = {...img};
      const src = img.data;

      let rgba: Uint8Array;
      switch (format) {
        case "dxt1":
          rgba = decodeDXT(src, "dxt1", width, height);
          break;
        case "dxt3":
          rgba = decodeDXT(src, "dxt3", width, height);
          break;
        case "dxt5":
          rgba = decodeDXT(src, "dxt5", width, height);
          break;
        default:
          throw new Error("Unsupported DDS format: " + format);
      }

      results.push({ width, height, data: rgba });
    }

    return results;
  } catch (e1) { 
    try {
      return [parseUncompressedDDS(buffer)]; 
    }
    catch (e2) {
      throw new Error("Failed to parse DDS file: \n" + e1 + "\n" + e2);
    }
  }
}

export function parseUncompressedDDS(buffer: Uint8Array): RGBAImage {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
  if (magic !== "DDS ") {
    throw new Error("Invalid DDS magic number");
  }

  const height = view.getUint32(12, true);
  const width = view.getUint32(16, true);

  const fourCC = String.fromCharCode(
    view.getUint8(84),
    view.getUint8(85),
    view.getUint8(86),
    view.getUint8(87)
  );
  const rgbBitCount = view.getUint32(88, true);
  const rMask = view.getUint32(92, true);
  const gMask = view.getUint32(96, true);
  const bMask = view.getUint32(100, true);
  const aMask = view.getUint32(104, true);

  if (fourCC.trim() !== "" && fourCC !== "\0\0\0\0") {
    throw new Error("Not an uncompressed RGBA DDS (FourCC found: " + fourCC + ")");
  }
  if (rgbBitCount !== 32) {
    throw new Error("Unsupported bit depth: " + rgbBitCount);
  }

  const pixelOffset = 128;
  const pixelCount = width * height;
  const out = new Uint8Array(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const pixel = view.getUint32(pixelOffset + i * 4, true);

    const r = extractChannel(pixel, rMask);
    const g = extractChannel(pixel, gMask);
    const b = extractChannel(pixel, bMask);
    const a = aMask !== 0 ? extractChannel(pixel, aMask) : 255;

    const dst = i * 4;
    out[dst] = r;
    out[dst + 1] = g;
    out[dst + 2] = b;
    out[dst + 3] = a;
  }

  return { width, height, data: out };
}

function extractChannel(pixel: number, mask: number): number {
  if (mask === 0) {
    return 0;
  }

  let shift = 0;
  while (((mask >> shift) & 1) === 0) {
    shift++;
  }

  let bits = 0;
  while (((mask >> (shift + bits)) & 1) === 1) {
    bits++;
  }

  const value = (pixel & mask) >> shift;
  const max = (1 << bits) - 1;

  return Math.round((value / max) * 255);
}
