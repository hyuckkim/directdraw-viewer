export interface DdsMetadata {
    width: number;
    height: number;
    format: "dxt1" | "dxt3" | "dxt5";
    images: {
        data: Uint8Array<ArrayBufferLike>;
        width: number;
        height: number;
    }[];
};

export function parseDDS(data: Uint8Array): DdsMetadata {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Magic Number ('DDS ')
    if (view.getUint32(0, true) !== 0x20534444) {
        throw new Error('Invalid magic number in DDS header');
    }

    const height = view.getInt32(12, true); // off_height = 3 (3 * 4 = 12 bytes)
    const width = view.getInt32(16, true);  // off_width = 4
    const mipmapCount = (view.getInt32(8, true) & 0x20000) 
                        ? Math.max(1, view.getInt32(28, true)) 
                        : 1;
    const fourCC = view.getUint32(84, true); // off_pfFourCC = 21

    let format: "dxt1" | "dxt3" | "dxt5" | "";
    let blockBytes = 0;

    const FOURCC_DXT1 = 0x31545844; // 'DXT1'
    const FOURCC_DXT3 = 0x33545844; // 'DXT3'
    const FOURCC_DXT5 = 0x35545844; // 'DXT5'

    if (fourCC === FOURCC_DXT1) { format = 'dxt1'; blockBytes = 8; }
    else if (fourCC === FOURCC_DXT3) { format = 'dxt3'; blockBytes = 16; }
    else if (fourCC === FOURCC_DXT5) { format = 'dxt5'; blockBytes = 16; }
    else {
      throw new Error('Unsupported DDS format');
    }

    const headerSize = 128;
    let currentOffset = headerSize;
    let currentWidth = width;
    let currentHeight = height;
    const images = [];

    for (let i = 0; i < mipmapCount; i++) {
        const dataLength = Math.max(4, currentWidth) / 4 * Math.max(4, currentHeight) / 4 * blockBytes;
        
        images.push({
            data: data.subarray(currentOffset, currentOffset + dataLength),
            width: currentWidth,
            height: currentHeight
        });

        currentOffset += dataLength;
        currentWidth = Math.floor(currentWidth / 2) || 1;
        currentHeight = Math.floor(currentHeight / 2) || 1;
    }

    return { width, height, format, images };
}