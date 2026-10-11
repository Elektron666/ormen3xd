"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { FEEDBACK_KINDS, FEEDBACK_LABELS, FEEDBACK_LIMITS, looksPersonal, type FeedbackKind } from "@/lib/feedback";
import { device } from "@/lib/track";

// "Bize fikir verin": a few words to ORMEN. Anonymous unless the visitor asks
// for an answer and leaves a firm name, name and phone with consent.

export function FeedbackDialog({ open, onClose, firmSlug }: { open: boolean; onClose: () => void; firmSlug: string | null }) {
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [contact, setContact] = useState({ company: "", name: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const wantsAnswer = !!(contact.company.trim() || contact.name.trim() || contact.phone.trim());
  const [state, setState] = useState<"bos" | "gonderiliyor" | "tamam">("bos");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    if (state === "tamam") {
      setKind(null);
      setMessage("");
      setContact({ company: "", name: "", phone: "" });
      setConsent(false);
      setState("bos");
    }
  };

  const send = async () => {
    if (!kind) return setError("Bir konu seçin.");
    setState("gonderiliyor");
    setError(null);
    try {
      const res = await fetch("/api/geri-bildirim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, message, website, page: location.pathname, firmSlug, device: device(), contact: wantsAnswer ? { ...contact, consent } : undefined }),
      });
      if (!res.ok) {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Gönderilemedi.");
        setState("bos");
        return;
      }
      setState("tamam");
    } catch {
      setError("Bağlantı kurulamadı; biraz sonra tekrar deneyin.");
      setState("bos");
    }
  };

  return (
    <Dialog open={open} onClose={close} title="Bize fikir verin">
      {state === "tamam" ? (
        <div className="flex flex-col gap-4" role="status">
          <p className="text-[15px]">Teşekkürler, ORMEN’e ulaştı.{wantsAnswer ? " Size telefonla döneceğiz." : ""}</p>
          <button type="button" onClick={close} className="h-11 rounded-full bg-antrasit px-5 text-[14px] text-kagit">
            Kapat
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <fieldset>
            <legend className="mb-2 text-[13px] text-antrasit-70">Konu</legend>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={`h-10 rounded-full border px-4 text-[14px] ${kind === k ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi text-antrasit hover:border-cizgi-koyu"}`}
                >
                  {FEEDBACK_LABELS[k]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-[13px] text-antrasit-70">
            <span className="flex justify-between">
              Fikriniz
              <span className="tabular-nums text-antrasit-50">
                {message.length}/{FEEDBACK_LIMITS.max}
              </span>
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={FEEDBACK_LIMITS.max}
              rows={3}
              className="rounded-xl border border-cizgi bg-white p-3 text-[15px] text-antrasit focus:border-antrasit-50 focus:outline-none"
            />
          </label>
          <fieldset className="rounded-xl border border-cizgi p-3">
            <legend className="px-1 text-[13px] text-antrasit-70">Size dönelim mi? (isteğe bağlı)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["company", "Firma adı", "organization", "sm:col-span-2"],
                  ["name", "Ad soyad", "name", ""],
                  ["phone", "Telefon", "tel", ""],
                ] as const
              ).map(([key, label, auto, span]) => (
                <label key={key} className={`flex flex-col gap-1 text-[12px] text-antrasit-70 ${span}`}>
                  {label}
                  <input
                    value={contact[key]}
                    onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                    autoComplete={auto}
                    inputMode={key === "phone" ? "tel" : undefined}
                    placeholder={key === "phone" ? "0532 123 45 67" : undefined}
                    maxLength={key === "phone" ? 30 : 80}
                    className="h-10 rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit focus:border-antrasit-50 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            {wantsAnswer && (
              <label className="mt-3 flex items-start gap-2 text-[12.5px] leading-snug text-antrasit-70">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-antrasit" />
                <span>
                  Adımın, firma adımın ve telefonumun yalnızca bu mesaja dönüş için ORMEN TEKSTİL tarafından kullanılmasını kabul ediyorum.{" "}
                  <Link href="/kvkk" target="_blank" className="underline underline-offset-2">
                    Aydınlatma metni
                  </Link>
                </span>
              </label>
            )}
          </fieldset>
          {/* a person never sees or fills this; a bot does */}
          <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          {looksPersonal(message) && (
            <p className="text-[12px] text-[#9a3b31]">Mesajda telefon ya da e-posta var gibi görünüyor. Size dönmemizi istiyorsanız iletişim bilgilerini yukarıdaki alanlara yazın.</p>
          )}
          {!wantsAnswer && !looksPersonal(message) && <p className="text-[12px] text-antrasit-50">İletişim alanlarını boş bırakırsanız mesajınız isimsiz kaydedilir.</p>}
          {error && (
            <p role="alert" className="text-[13px] text-[#9a3b31]">
              {error}
            </p>
          )}
          <button type="submit" disabled={state === "gonderiliyor"} className="h-11 rounded-full bg-antrasit px-5 text-[14px] text-kagit disabled:opacity-60">
            {state === "gonderiliyor" ? "Gönderiliyor…" : "Gönder"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
