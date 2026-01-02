// declare decompress only. from https://github.com/icewind1991/dxt.js/blob/master/src/dxt.js

declare module "dxt-js" {
  /**
   * Decompress a DXT-compressed image into RGBA8 pixel data.
   *
   * @param inputData Compressed image data (DDS body)
   * @param width     Image width in pixels
   * @param height    Image height in pixels
   * @param flags     Compression format flag (DXT1, DXT3, DXT5)
   * @returns         RGBA pixel data (Uint8Array, length = width * height * 4)
   */
  export function decompress(
    inputData: Uint8Array,
    width: number,
    height: number,
    flags: number
  ): Uint8Array;

  export const flags: {
    /** Use DXT1 compression. */
    DXT1: number;
    /** Use DXT3 compression. */
    DXT3: number;
    /** Use DXT5 compression. */
    DXT5: number;
    /** Very slow but very high quality colour compressor. */
    ColourIterativeClusterFit: number;
    /** Slow but high quality colour compressor (default). */
    ColourClusterFit: number;
    /** Fast but low quality colour compressor. */
    ColourRangeFit: number;
    /** Perceptual metric for colour error (default). */
    ColourMetricPerceptual: number;
    /** Uniform metric for colour error. */
    ColourMetricUniform: number;
    /** Weight colour by alpha during cluster fit (disabled by default). */
    WeightColourByAlpha: number;
  };
}
