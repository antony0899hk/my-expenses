export type PreparedReceiptCandidate = { image: Blob; label: "中央偏上" | "中央偏下" | "全圖" };

function canvasBlob(canvas: HTMLCanvasElement, fallback: Blob) {
  return new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob || fallback), "image/png"));
}

// Local-only preparation. Tall screenshots get two receipt-focused crops before full-image fallback.
export async function prepareReceiptCandidates(file: File): Promise<PreparedReceiptCandidate[]> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const tall = image.naturalHeight / image.naturalWidth >= 1.55;
    const regions = tall ? [
      { x: .22, y: .14, w: .56, h: .44, label: "中央偏上" as const },
      { x: .22, y: .30, w: .56, h: .44, label: "中央偏下" as const },
      { x: 0, y: 0, w: 1, h: 1, label: "全圖" as const },
    ] : [{ x: 0, y: 0, w: 1, h: 1, label: "全圖" as const }];
    const candidates: PreparedReceiptCandidate[] = [];
    for (const region of regions) {
      const sourceWidth = Math.round(image.naturalWidth * region.w);
      const sourceHeight = Math.round(image.naturalHeight * region.h);
      const scale = Math.min(6, 3000 / Math.max(sourceWidth, sourceHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sourceWidth * scale);
      canvas.height = Math.round(sourceHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.filter = "grayscale(1) contrast(1.2)";
      context.drawImage(image, Math.round(image.naturalWidth * region.x), Math.round(image.naturalHeight * region.y), sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      candidates.push({ image: await canvasBlob(canvas, file), label: region.label });
    }
    return candidates.length ? candidates : [{ image: file, label: "全圖" }];
  } catch {
    return [{ image: file, label: "全圖" }];
  } finally {
    URL.revokeObjectURL(url);
  }
}
