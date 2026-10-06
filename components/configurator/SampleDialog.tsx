"use client";

import { useState } from "react";
import Link from "next/link";
import type { Fabric } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { CHOICE_KEYS, SAMPLE_CHOICES, sampleWhatsappText, validateSample, whatsappUrl, type SampleChoices, type SampleErrors, type SampleRequestInput } from "@/lib/samples";

export interface SampleDialogProps {
  open: boolean;
  onClose: () => void;
  /** Fabrics in the current layout; the selected one comes first and is pre-ticked. */
  fabrics: Fabric[];
  firmSlug?: string | null;
  firmName?: string | null;
  /** Number the WhatsApp hand-off goes to: the firm's, or ORMEN's. Hidden when empty. */
  whatsapp?: string | null;
  modelSlugs: string[];
  link: () => string;
  onSent?: (codes: string[]) => void;
}

type Stage = { kind: "form" } | { kind: "sending" } | { kind: "done"; value: SampleRequestInput } | { kind: "error"; message: string };

export function SampleDialog({ open, onClose, fabrics, firmSlug, firmName, whatsapp, modelSlugs, link, onSent }: SampleDialogProps) {
  const [picked, setPicked] = useState<string[]>(() => fabrics.slice(0, 1).map((f) => f.code));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [choices, setChoices] = useState<SampleChoices>({});
  const [consent, setConsent] = useState(false);
  const [web, setWeb] = useState(""); // honeypot: hidden from people, bots fill it
  const [errors, setErrors] = useState<SampleErrors>({});
  const [stage, setStage] = useState<Stage>({ kind: "form" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = { name, phone, choices, consent, fabricCodes: picked, firmSlug, modelSlugs, link: link() };
    const check = validateSample(input);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setStage({ kind: "sending" });
    try {
      const res = await fetch("/api/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, web }) });
      if (res.status === 422) {
        setErrors((await res.json()).errors ?? {});
        setStage({ kind: "form" });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      // the stored link is site-relative; WhatsApp needs the full address
      setStage({ kind: "done", value: { ...check.value, link: input.link } });
      onSent?.(check.value.fabricCodes);
    } catch {
      setStage({ kind: "error", message: "Talep gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin." });
    }
  };

  const close = () => {
    onClose();
    if (stage.kind === "done") {
      setStage({ kind: "form" });
      setName("");
      setPhone("");
      setChoices({});
      setConsent(false);
    }
  };

  const field = "h-11 w-full rounded-lg border border-cizgi bg-white/80 px-3 text-[15px] focus:border-antrasit-50 focus:bg-white focus:outline-none";
  const recipient = firmName ?? "ORMEN TEKSTİL";

  return (
    <Dialog open={open} onClose={close} title="Numune iste">
      {stage.kind === "done" ? (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed">
            Talebiniz alındı. <strong>{stage.value.fabricCodes.join(", ")}</strong> numunesi için {recipient} sizinle iletişime geçecek.
          </p>
          {whatsapp && (
            <a
              href={whatsappUrl(whatsapp, sampleWhatsappText(stage.value))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center rounded-full bg-antrasit text-[15px] text-kagit hover:bg-ceviz focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
            >
              WhatsApp’tan da gönder
            </a>
          )}
          <button type="button" onClick={close} className="h-11 rounded-full border border-cizgi text-[14px] hover:border-cizgi-koyu">
            Tamam
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Web sitesi
              <input type="text" name="web" tabIndex={-1} autoComplete="off" value={web} onChange={(e) => setWeb(e.target.value)} />
            </label>
          </div>
          <fieldset>
            <legend className="eyebrow mb-2">Kumaş</legend>
            <div className="flex flex-wrap gap-2">
              {fabrics.map((f) => {
                const on = picked.includes(f.code);
                return (
                  <label
                    key={f.code}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] ${on ? "border-antrasit bg-white" : "border-cizgi"}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => setPicked(on ? picked.filter((c) => c !== f.code) : [...picked, f.code])}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.texture.thumbUrl} alt="" className="h-7 w-7 rounded-full" />
                    <span translate="no">{f.code}</span>
                    <span aria-hidden="true" className={on ? "text-antrasit" : "text-transparent"}>
                      ✓
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.fabricCodes && <p className="mt-1.5 text-[13px] text-[#9a3b31]">{errors.fabricCodes}</p>}
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-antrasit-70">Ad soyad</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
            {errors.name && <span className="text-[13px] text-[#9a3b31]">{errors.name}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-antrasit-70">Telefon</span>
            <input
              className={field}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="0532 123 45 67"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <span className="text-[13px] text-[#9a3b31]">{errors.phone}</span>}
          </label>
          {/* fixed choices instead of a free-text note: no room for an address or ID number */}
          {CHOICE_KEYS.map((key) => {
            const group = SAMPLE_CHOICES[key];
            return (
              <fieldset key={key} className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-[13px] text-antrasit-70">
                  {group.label} <span className="text-antrasit-50">(isteğe bağlı)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(group.options).map(([value, label]) => {
                    const on = choices[key] === value;
                    return (
                      <label
                        key={value}
                        className={`flex h-10 cursor-pointer items-center rounded-full border px-4 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-antrasit ${
                          on ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white/80 hover:border-cizgi-koyu"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`numune-${key}`}
                          className="sr-only"
                          checked={on}
                          // a second tap clears the choice
                          onClick={() => on && setChoices((c) => ({ ...c, [key]: undefined }))}
                          onChange={() => setChoices((c) => ({ ...c, [key]: value }))}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <label className="flex items-start gap-2.5 text-[13px] leading-snug text-antrasit-70">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2a2a28]" />
            <span>
              Adım ve telefonumun yalnızca numune talebim için {recipient === "ORMEN TEKSTİL" ? "ORMEN TEKSTİL" : `${recipient} ve ORMEN TEKSTİL`} ile
              paylaşılmasını kabul ediyorum.{" "}
              <Link href="/kvkk" target="_blank" className="underline underline-offset-2">
                Aydınlatma metni
              </Link>
            </span>
          </label>
          {errors.consent && <p className="-mt-2 text-[13px] text-[#9a3b31]">{errors.consent}</p>}
          {stage.kind === "error" && <p className="text-[13px] text-[#9a3b31]">{stage.message}</p>}

          <button
            type="submit"
            disabled={stage.kind === "sending"}
            className="mt-1 h-12 rounded-full bg-antrasit text-[15px] text-kagit transition-colors hover:bg-ceviz disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
          >
            {stage.kind === "sending" ? "Gönderiliyor…" : "Talebi gönder"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
