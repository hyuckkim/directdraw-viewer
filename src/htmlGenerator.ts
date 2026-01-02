import { readFileSync } from "fs";
import { ddsToRGBAArray, RGBAImage } from "./parser";
import { rgbaToDataURL } from "./encoder";

export async function generateRGBAArrayFromDDS(filePath: string) {
  const buf = readFileSync(filePath);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const ddsInfo = ddsToRGBAArray(arrayBuffer);

  return ddsInfo;
}

export function generateHtmlFromRGBAArray(images: RGBAImage[]): string {
  return images.map((img) => {
    const url = rgbaToDataURL(img.data, img.width, img.height);

    return `<img src="${url}" width="${img.width}" height="${img.height}" class="dds-image"/>`;
  }).join("");
}
