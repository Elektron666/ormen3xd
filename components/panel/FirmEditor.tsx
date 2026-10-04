"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Firm, FurnitureModel } from "@/lib/types";
import { contrast, inkFor, validateFirm, type FirmErrors } from "@/lib/firm";
import { slugify, stamp, uploadFile } from "@/lib/panel/upload";
import { saveFirmAction } from "@/app/panel/actions";
import { buttonClass, Field, inputClass } from "./ui";

// Firm settings: name and link, logo, colour, WhatsApp number and which
// models the firm page shows. Firm-only models are added from the model page.

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_MB = 2;
const PAGE_BG = "#F5F1EA";

export function FirmEditor({
  firm,
  showcaseIds = [],
  showcase,
  ownModels = [],
}: {
  firm?: Firm | null;
  showcaseIds?: string[];
  showcase: FurnitureModel[];
  ownModels?: FurnitureModel[];
}) {
  const router = useRouter();
  const [name, setName] = useState(firm?.name ?? "");
  const [slug, setSlug] = useState(firm?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!firm);
  const [accent, setAccent] = useState(firm?.accentColor ?? "#1F4E4A");
  const [whatsapp, setWhatsapp] = useState(firm?.whatsapp ?? "");
  const [isActive, setIsActive] = useState(firm?.isActive ?? true);
  const [picked, setPicked] = useState<string[]>(showcaseIds);
  const [logo, setLogo] = useState<{ file: File; preview: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState(firm?.logoUrl);
  const [errors, setErrors] = useState<FirmErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = logo?.preview;
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [logo]);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const validAccent = /^#[0-9A-Fa-f]{6}$/.test(accent);
  const lowContrast = validAccent && contrast(accent, PAGE_BG) < 3;

  const pickLogo = (f: File | undefined) => {
    if (!f) return;
    if (!LOGO_TYPES.includes(f.type)) return setErrors((e) => ({ ...e, logo: "Logo PNG, JPEG ya da WebP olmalı. (SVG güvenlik nedeniyle kabul edilmiyor.)" }));
    if (f.size > LOGO_MAX_MB * 1024 * 1024) return setErrors((e) => ({ ...e, logo: `Logo en fazla ${LOGO_MAX_MB} MB olabilir.` }));
    setErrors((e) => {
      const rest = { ...e };
      delete rest.logo;
      return rest;
    });
    setLogo({ file: f, preview: URL.createObjectURL(f) });
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    const fields = { name, slug: effectiveSlug, accentColor: accent, whatsapp };
    const v = validateFirm(fields);
    if (!v.ok) {
      setErrors(v.errors);
      setStatus("Eksik ya da hatalı alanlar var.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      let url = logoUrl;
      if (logo) {
        setStatus("Logo yükleniyor…");
        const ext = logo.file.type === "image/png" ? "png" : logo.file.type === "image/webp" ? "webp" : "jpg";
        url = await uploadFile(`logolar/${effectiveSlug}-${stamp()}.${ext}`, logo.file);
        setLogoUrl(url);
        setLogo(null);
      }
      setStatus("Kaydediliyor…");
      const res = await saveFirmAction({ id: firm?.id, fields, logoUrl: url, isActive, showcaseIds: picked });
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setStatus(res.error ?? "Kaydedilemedi; işaretli alanlara bakın.");
        return;
      }
      setStatus(null);
      router.push(`/panel/firmalar/${res.id}?kaydedildi=1`);
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const shownLogo = logo?.preview ?? logoUrl;
  const ink = validAccent ? inkFor(accent) : "#FFFFFF";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-2 gap-3">
          <h2 className="eyebrow col-span-2">1 · Firma</h2>
          <Field label="Firma adı" error={errors.name} className="col-span-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-invalid={!!errors.name} placeholder="ör. Yıldız Mobilya" />
          </Field>
          <Field label="Bağlantı adı" error={errors.slug} hint={`Adres: /f/${effectiveSlug || "…"}`} className="col-span-2">
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className={inputClass}
              aria-invalid={!!errors.slug}
            />
          </Field>
          {firm && effectiveSlug !== firm.slug && (
            <p className="col-span-2 rounded-xl bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">
              Bağlantı adını değiştirirseniz basılmış QR kodları ve dağıtılmış linkler çalışmaz.
            </p>
          )}
          <Field label="WhatsApp numarası" error={errors.whatsapp} hint="Numune talepleri bu numaraya da iletilir" className="col-span-2">
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} inputMode="tel" placeholder="0532 123 45 67" aria-invalid={!!errors.whatsapp} />
          </Field>
        </section>

        <section>
          <h2 className="eyebrow mb-2">2 · Görünüm</h2>
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-24 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-cizgi-koyu bg-white p-3 text-[13px] text-antrasit-50 hover:border-antrasit-50"
              >
                {shownLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownLogo} alt="Firma logosu" className="max-h-full max-w-full object-contain" />
                ) : (
                  "Logo yükle"
                )}
              </button>
              <input ref={fileInput} type="file" accept={LOGO_TYPES.join(",")} className="hidden" aria-label="Firma logosu" onChange={(e) => pickLogo(e.target.files?.[0])} />
              {errors.logo ? <p className="mt-1 max-w-48 text-[12px] text-[#9a3b31]">{errors.logo}</p> : <p className="mt-1 text-[12px] text-antrasit-50">PNG (şeffaf zemin), en fazla 2 MB</p>}
              {shownLogo && (
                <button
                  type="button"
                  className={`${buttonClass.quiet} mt-1`}
                  onClick={() => {
                    setLogo(null);
                    setLogoUrl(undefined);
                  }}
                >
                  Logoyu kaldır
                </button>
              )}
            </div>
            <Field label="Firma rengi" error={errors.accentColor} hint={lowContrast ? undefined : "Düğmelerde ve vurgularda kullanılır"}>
              <span className="flex items-center gap-2">
                <input type="color" value={validAccent ? accent : "#000000"} onChange={(e) => setAccent(e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-cizgi bg-white p-1" aria-label="Renk seçici" />
                <input value={accent} onChange={(e) => setAccent(e.target.value)} className={`${inputClass} w-32`} aria-invalid={!!errors.accentColor} aria-label="Renk kodu" />
              </span>
            </Field>
          </div>
          {lowContrast && <p className="mt-2 rounded-xl bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">Bu renk açık zeminde zor seçilir; biraz daha koyu bir ton önerilir.</p>}
        </section>

        <section>
          <h2 className="eyebrow mb-2">3 · Sayfada görünecek modeller</h2>
          {ownModels.length > 0 && (
            <ul className="mb-3 flex flex-col divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
              {ownModels.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                  <span className="flex-1">
                    <span className="font-medium">{m.name}</span> <span className="text-antrasit-50">· firmaya özel{m.isActive ? "" : " · gizli"}</span>
                  </span>
                  <Link href={`/panel/modeller/${m.id}`} className={buttonClass.quiet}>
                    Düzenle
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <ul className="flex flex-col divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
            {showcase.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[14px]">
                  <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} className="h-4 w-4 accent-[#2a2a28]" />
                  <span className="flex-1 font-medium">{m.name}</span>
                  <span className="text-[12px] text-antrasit-50">ORMEN vitrini</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12px] text-antrasit-50">
            Hiçbiri seçilmez ve firmaya özel model yoksa ORMEN vitrinindeki bütün modeller gösterilir.
            {firm ? (
              <>
                {" "}
                <Link href={`/panel/modeller/yeni?firma=${firm.id}`} className="underline">
                  Bu firmaya özel model ekle
                </Link>
              </>
            ) : (
              " Firmaya özel model, firma kaydedildikten sonra eklenebilir."
            )}
          </p>
        </section>

        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[#2a2a28]" />
          Firma sayfası yayında
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-cizgi pt-4">
          <button type="button" onClick={save} disabled={saving} className={buttonClass.primary}>
            {saving ? (status ?? "Kaydediliyor…") : "Kaydet"}
          </button>
          {status && !saving && (
            <p role="alert" className="text-[13px] text-[#9a3b31]">
              {status}
            </p>
          )}
        </div>
      </div>

      {/* what the firm's customers will see */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="eyebrow mb-2">Önizleme</p>
        <div className="overflow-hidden rounded-2xl border border-cizgi bg-kirik-beyaz">
          <div className="studio-backdrop relative h-56">
            <div className="absolute left-4 top-4 rounded-xl bg-kagit/90 px-3 py-2 shadow-sm">
              {shownLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownLogo} alt="" className="h-9 w-auto max-w-[160px] object-contain" />
              ) : (
                <span className="font-display text-xl">{name || "Firma adı"}</span>
              )}
            </div>
            <span
              className="absolute right-4 top-4 rounded-full px-4 py-2 text-[13px]"
              style={{ background: validAccent ? accent : "#2A2A28", color: ink }}
            >
              Numune iste
            </span>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-antrasit-50">Kumaşlar: ORMEN TEKSTİL</span>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-antrasit-50">Logo sol üstte, firma rengi düğmelerde görünür. Kumaşlar her zaman ORMEN kumaşıdır.</p>
      </div>
    </div>
  );
}
