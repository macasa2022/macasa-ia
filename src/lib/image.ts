// Reduz fotos grandes antes de as enviar para a IA.
// Fotos de telemóvel (3–10 MB) excedem facilmente o limite de imagem da API
// e tornam o pedido lento; 1600 px chega para ler um enunciado.

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = original;
    });

    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    // Já é pequena e leve: manter o original
    if (scale === 1 && file.size < 1_500_000) return original;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.fillStyle = "#ffffff"; // fundo branco para PNG com transparência
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return original;
  }
}
