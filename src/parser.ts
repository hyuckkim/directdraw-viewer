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

interface DdsHeader {
  width: number;
  height: number;
  depth: number;
  mipmapCount: number;
  rgbBitCount: number;
  rMask: number;
  gMask: number;
  bMask: number;
  aMask: number;
  caps2: number;
}

export function parseUncompressedDDS(buffer: Uint8Array): ParseResult {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x20534444) {
    throw new Error("Invalid magic number");
  }

  const header = parseHeader(view);

  if (header.caps2 & 0x00000200) { // DDSCAPS2_CUBEMAP
    const faces = parseCubeMap(buffer, header);
    return { metadata: { ...header, format: `uncompressed cubemap ${getFormatName(header)}`, images: [] }, content: faces.flat() };
  } else if (header.depth > 1) {
    const slices = parseVolumeTexture(buffer, header);
    return { metadata: { ...header, format: `uncompressed volume ${getFormatName(header)}`, images: [] }, content: slices.flat() };
  } else {
    const images = parseSurfaceData(buffer, header, 128);
    return { metadata: { ...header, format: `uncompressed 2D ${getFormatName(header)}`, images: [] }, content: images };
  }
}

function parseSurfaceData(
  buffer: Uint8Array,
  header: DdsHeader,
  offset: number
): RGBAImage[] {
  const results: RGBAImage[] = [];
  let currentOffset = offset;

  for (let i = 0; i < header.mipmapCount; i++) {
    const mWidth = Math.max(1, header.width >> i);
    const mHeight = Math.max(1, header.height >> i);
    const pixelCount = mWidth * mHeight;
    const byteSize = pixelCount * (header.rgbBitCount / 8);

    if (currentOffset + byteSize > buffer.byteLength) { break; }

    const rgbaData = new Uint8Array(pixelCount * 4);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const rMask = calcChannel(header.rMask);
    const gMask = calcChannel(header.gMask);
    const bMask = calcChannel(header.bMask);
    const aMask = calcChannel(header.bMask);
    for (let p = 0; p < pixelCount; p++) {
      const pos = currentOffset + p * (header.rgbBitCount / 8);
      let pixel = 0;

      if (header.rgbBitCount === 32) { pixel = view.getUint32(pos, true); }
      else if (header.rgbBitCount === 24) {
        pixel = view.getUint8(pos) |
                (view.getUint8(pos + 1) << 8) |
                (view.getUint8(pos + 2) << 16);
      } else if (header.rgbBitCount === 16) { pixel = view.getUint16(pos, true); }

      const dst = p * 4;
      rgbaData[dst]     = extractChannel(pixel, rMask);
      rgbaData[dst + 1] = extractChannel(pixel, gMask);
      rgbaData[dst + 2] = extractChannel(pixel, bMask);
      rgbaData[dst + 3] = header.aMask !== 0 ? extractChannel(pixel, aMask) : 255;
    }

    results.push({ width: mWidth, height: mHeight, data: rgbaData });
    currentOffset += byteSize;
  }

  return results;
}

function parseCubeMap(buffer: Uint8Array, header: DdsHeader): RGBAImage[][] {
  const faces: RGBAImage[][] = [];
  const faceNames = ["posX", "negX", "posY", "negY", "posZ", "negZ"];
  let offset = 128;

  for (const face of faceNames) {
    if (header.caps2 & getCubeFaceFlag(face)) {
      const images = parseSurfaceData(buffer, header, offset);
      faces.push(images);
      // offset 증가: 각 face 데이터 크기만큼 더해줘야 함
      const faceSize = images.reduce((sum, img) => sum + img.data.byteLength, 0);
      offset += faceSize;
    }
  }
  return faces;
}

function getCubeFaceFlag(face: string): number {
  switch (face) {
    case "posX": return 0x00000600; // DDSCAPS2_CUBEMAP_POSITIVEX
    case "negX": return 0x00000a00;
    case "posY": return 0x00001200;
    case "negY": return 0x00002200;
    case "posZ": return 0x00004200;
    case "negZ": return 0x00008200;
    default: return 0;
  }
}

function parseVolumeTexture(buffer: Uint8Array, header: DdsHeader): RGBAImage[][] {
  const slices: RGBAImage[][] = [];
  let offset = 128;

  for (let z = 0; z < header.depth; z++) {
    const images = parseSurfaceData(buffer, header, offset);
    slices.push(images);
    const sliceSize = images.reduce((sum, img) => sum + img.data.byteLength, 0);
    offset += sliceSize;
  }
  return slices;
}

function parseHeader(view: DataView): DdsHeader {
  return {
    width: view.getUint32(16, true),
    height: view.getUint32(12, true),
    depth: view.getUint32(24, true), // dwDepth
    mipmapCount: Math.max(1, view.getUint32(28, true)),
    rgbBitCount: view.getUint32(88, true),
    rMask: view.getUint32(92, true),
    gMask: view.getUint32(96, true),
    bMask: view.getUint32(100, true),
    aMask: view.getUint32(104, true),
    caps2: view.getUint32(112, true) // dwCaps2
  };
}


interface ChannelInfo {
  mask: number;
  shift: number;
  bits: number;
}

function calcChannel(mask: number): ChannelInfo {
  if (mask === 0) {
    return { mask: 0, shift: 0, bits: 0 };
  }

  let shift = 0;
  while (((mask >> shift) & 1) === 0) { shift++; }

  let bits = 0;
  while (((mask >> (shift + bits)) & 1) === 1) { bits++; }

  return { mask, shift, bits };
}

function extractChannel(pixel: number, channel: ChannelInfo): number {
  if (channel.mask === 0) { return 0; }

  const value = (pixel & channel.mask) >> channel.shift;
  const max = (1 << channel.bits) - 1;
  return Math.round((value / max) * 255);
}


function getFormatName({rMask, gMask, bMask, aMask}: DdsHeader): string {
  const countBits = (mask: number) => {
    if (mask === 0) {
      return 0;
    }
    let m = mask;
    while (m !== 0 && (m & 1) === 0) { m >>>= 1; }
    let count = 0;
    while ((m & 1) === 1) { count++; m >>>= 1; }
    return count;
  };

  const getShift = (mask: number) => {
    if (mask === 0) {
      return -1;
    }
    let shift = 0;
    while (((mask >> shift) & 1) === 0) { shift++; }
    return shift;
  };

  const channels = [
    { name: 'R', mask: rMask, bits: countBits(rMask), shift: getShift(rMask) },
    { name: 'G', mask: gMask, bits: countBits(gMask), shift: getShift(gMask) },
    { name: 'B', mask: bMask, bits: countBits(bMask), shift: getShift(bMask) },
    { name: 'A', mask: aMask, bits: countBits(aMask), shift: getShift(aMask) }
  ];

  const activeChannels = channels
    .filter(c => c.mask !== 0)
    .sort((a, b) => b.shift - a.shift);

  const namePart = activeChannels.map(c => c.name).join('');
  const bitPart = activeChannels.map(c => c.bits).join('');

  return `${namePart}${bitPart}`;
}