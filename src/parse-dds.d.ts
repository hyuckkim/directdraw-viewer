// parse argument types is actually Uint8Array | ArrayBuffer
// @types/parse-dds show incorrect types (only ArrayBuffer)

declare module "parse-dds" {
  interface DdsInfo {
    shape: [number, number];
    images: Array<{
      offset: number;
      length: number;
      shape: [number, number];
    }>;
    format: "dxt1" | "dxt3" | "dxt5" | "rgba32f";
    flags: number;
    cubemap: boolean;
  }

  function parse(buffer: Uint8Array | ArrayBuffer): DdsInfo;
  export = parse;
}
