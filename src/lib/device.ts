// Identifica este navegador (todos os separadores partilham o mesmo id).
// Não usa o IP: mudar de Wi-Fi para dados móveis não muda nada.

const KEY = "macasa-device-id";
let memoryId: string | null = null;

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Navegação privada/armazenamento bloqueado: id só desta página
    if (!memoryId) memoryId = crypto.randomUUID();
    return memoryId;
  }
}

/** Descrição legível, p.ex. "Chrome · Windows". */
export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os =
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iPhone/iPad" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "Mac" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}
