// Which AR path a device takes. Phones/tablets open the viewer in place;
// desktops show a QR code that opens the same piece on the phone.

export type ArDevice = "ios" | "android" | "desktop";

export function arDevice(ua: string, maxTouchPoints = 0): ArDevice {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS reports itself as a Mac with a touch screen
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function currentArDevice(): ArDevice {
  if (typeof navigator === "undefined") return "desktop";
  return arDevice(navigator.userAgent, navigator.maxTouchPoints);
}

/** Link that opens one piece of a shared layout in AR on a phone. */
export function arPath(shareId: string, piece: number): string {
  return `/ar/${shareId}${piece > 0 ? `?parca=${piece}` : ""}`;
}
