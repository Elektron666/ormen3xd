"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmTwoFactorAction, disableTwoFactorAction, startTwoFactorAction } from "@/app/panel/actions";
import { buttonClass, Field, inputClass } from "./ui";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "İşlem yapılamadı.");
      onOk();
    });

  const codeField = (
    <Field label="Uygulamadaki 6 haneli kod">
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className={`${inputClass} tracking-[0.4em]`} />
    </Field>
  );

  if (enabled)
    return (
      <div className="mt-4 flex flex-col gap-3">
        <p className="rounded-xl bg-[#e6efe4] px-4 py-3 text-[14px] text-[#2f5a2a]">Açık. Bu oturum kodla doğrulandı.</p>
        <details>
          <summary className="cursor-pointer text-[13px] text-antrasit-70">Kapat</summary>
          <div className="mt-3 flex flex-col gap-3">
            {codeField}
            {error && <p role="alert" className="text-[13px] text-[#9a3b31]">{error}</p>}
            <button type="button" disabled={pending || code.length !== 6} className={buttonClass.secondary} onClick={() => run(() => disableTwoFactorAction(code), () => router.refresh())}>
              İki adımlı doğrulamayı kapat
            </button>
          </div>
        </details>
      </div>
    );

  if (done) return <p className="mt-4 rounded-xl bg-[#e6efe4] px-4 py-3 text-[14px] text-[#2f5a2a]">{done}</p>;

  if (!setup)
    return (
      <div className="mt-4 flex flex-col gap-3">
        <p className="rounded-xl bg-[#fbeeec] px-4 py-3 text-[14px] text-[#7a2f27]">Kapalı.</p>
        {error && <p role="alert" className="text-[13px] text-[#9a3b31]">{error}</p>}
        <button
          type="button"
          disabled={pending}
          className={buttonClass.primary}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await startTwoFactorAction();
              if (res.ok) setSetup({ factorId: res.factorId, qr: res.qr, secret: res.secret });
              else setError(res.error);
            })
          }
        >
          {pending ? "Hazırlanıyor…" : "Aç"}
        </button>
      </div>
    );

  return (
    <div className="mt-4 flex flex-col gap-4">
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-antrasit-70">
        <li>Telefonunuza Google Authenticator ya da Microsoft Authenticator kurun.</li>
        <li>Uygulamada “+” → “QR kodu tara” ile aşağıdaki kodu okutun.</li>
        <li>Uygulamada çıkan 6 haneli kodu yazıp onaylayın.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URL made by Supabase, never fetched */}
      <img src={setup.qr.startsWith("data:") ? setup.qr : `data:image/svg+xml;utf-8,${encodeURIComponent(setup.qr)}`} alt="Doğrulama uygulaması için QR kod" className="h-48 w-48 self-center rounded-lg bg-white p-2" />
      <details>
        <summary className="cursor-pointer text-[13px] text-antrasit-70">QR okutamıyorum</summary>
        <p className="mt-2 text-[13px] text-antrasit-70">
          Uygulamada “Kurulum anahtarı gir”i seçip şunu yazın: <code className="break-all select-all rounded bg-white px-1.5 py-0.5">{setup.secret}</code>
        </p>
      </details>
      {codeField}
      {error && <p role="alert" className="text-[13px] text-[#9a3b31]">{error}</p>}
      <button
        type="button"
        disabled={pending || code.length !== 6}
        className={buttonClass.primary}
        onClick={() =>
          run(
            () => confirmTwoFactorAction(setup.factorId, code),
            () => {
              setDone("Açıldı. Bundan sonra panele girerken şifreden sonra bu uygulamanın kodu istenecek. Telefonu değiştirirseniz önce burada kapatın.");
              router.refresh();
            },
          )
        }
      >
        Onayla ve aç
      </button>
    </div>
  );
}
