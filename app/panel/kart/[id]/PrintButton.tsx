"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="h-11 rounded-full bg-antrasit px-5 text-[14px] text-kagit hover:bg-ceviz">
      Yazdır / PDF olarak kaydet
    </button>
  );
}
