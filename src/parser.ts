import { DdsMetadata, parseDDS } from "./parsedds";
import { decodeDXT } from "./decoder";

export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array; // RGBA8 pixel data
}
interface ParseResult {
  metadata: DdsMetadata;
  content: RGBAImage[];
}

export function ddsToRGBAArray(buffer: Uint8Array): ParseResult {
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

    return { metadata: info, content: results };
  } catch (e1) { 
    try {
      return parseUncompressedDDS(buffer);
    }
    catch (e2) {
      throw new Error("Failed to parse DDS file: \n" + e1 + "\n" + e2);
    }
  }
}

export function parseUncompressedDDS(buffer: Uint8Array): ParseResult {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    if (view.getUint32(0, true) !== 0x20534444) {
        throw new Error('Invalid magic number');
    }

    const width = view.getUint32(16, true);
    const height = view.getUint32(12, true);
    const mipmapCount = Math.max(1, view.getUint32(28, true));

    const rgbBitCount = view.getUint32(88, true); // 16, 24, 32
    const bytesPerPixel = rgbBitCount / 8;

    const rMask = view.getUint32(92, true);
    const gMask = view.getUint32(96, true);
    const bMask = view.getUint32(100, true);
    const aMask = view.getUint32(104, true);

    const metadata: DdsMetadata = {
        width,
        height,
        format: `uncompressed rgb-${rgbBitCount}`,
        images: []
    };
const content: RGBAImage[] = [];
  let currentOffset = 128;

  for (let i = 0; i < mipmapCount; i++) {
    const mWidth = Math.max(1, width >> i);
    const mHeight = Math.max(1, height >> i);
    const pixelCount = mWidth * mHeight;
    const byteSize = pixelCount * bytesPerPixel;

    if (currentOffset + byteSize > buffer.byteLength) {
      break;
    }

    metadata.images.push({ width: mWidth, height: mHeight, data: buffer.subarray(currentOffset, currentOffset + byteSize) });

    const rgbaData = new Uint8Array(pixelCount * 4);
    for (let p = 0; p < pixelCount; p++) {
      let pixel = 0;
      const pos = currentOffset + p * bytesPerPixel;

      if (rgbBitCount === 32) {
        pixel = view.getUint32(pos, true);
      } else if (rgbBitCount === 24) {
        // Little Endian
        pixel = view.getUint8(pos) | (view.getUint8(pos + 1) << 8) | (view.getUint8(pos + 2) << 16);
      } else if (rgbBitCount === 16) {
        pixel = view.getUint16(pos, true);
      }

      const dst = p * 4;
      rgbaData[dst]     = extractChannel(pixel, rMask);
      rgbaData[dst + 1] = extractChannel(pixel, gMask);
      rgbaData[dst + 2] = extractChannel(pixel, bMask);
      rgbaData[dst + 3] = aMask !== 0 ? extractChannel(pixel, aMask) : 255;
    }

    content.push({ width: mWidth, height: mHeight, data: rgbaData });
    currentOffset += byteSize;
  }

  return { metadata, content };
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
