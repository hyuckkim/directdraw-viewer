import { ddsToRGBAArray, RGBAImage } from "./parser";
import { rgbaToDataURL } from "./encoder";
import * as vscode from 'vscode';

export async function generateRGBAArrayFromDDS(filePath: vscode.Uri) {
  const buf = await vscode.workspace.fs.readFile(filePath);
  const ddsInfo = ddsToRGBAArray(buf);

  return ddsInfo;
}

export function generateHtmlFromRGBAArray(images: RGBAImage[]): string {
  return images.map((img) => {
    const url = rgbaToDataURL(img.data, img.width, img.height);

    return `<img src="${url}" width="${img.width}" height="${img.height}" class="dds-image"/>`;
  }).join("");
}
