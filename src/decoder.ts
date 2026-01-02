import { decompress, flags } from "dxt-js";

export function decodeDXT(buffer: ArrayBuffer, format: "dxt1" | "dxt3" | "dxt5", width: number, height: number): Uint8Array {
  const src = new Uint8Array(buffer);
  if (format === "dxt1") {
    return decompress(src, width, height, flags.DXT1);
  } else if (format === "dxt3") {
    return decompress(src, width, height, flags.DXT3);
  } else if (format === "dxt5") {
    return decompress(src, width, height, flags.DXT5);
  }
  throw new Error("Unsupported DXT format");
}
