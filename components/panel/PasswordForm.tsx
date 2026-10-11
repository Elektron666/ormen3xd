"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/panel/actions";
import { buttonClass, Field, inputClass } from "./ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  if (state?.ok) return <p className="mt-4 rounded-xl bg-[#e6efe4] px-4 py-3 text-[14px] text-[#2f5a2a]">Şifre değiştirildi.</p>;
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <Field label="Şu anki şifre">
        <input name="current" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Field label="Yeni şifre (en az 10 karakter)">
        <input name="next" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </Field>
      <Field label="Yeni şifre (tekrar)">
        <input name="again" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </Field>
      {state?.error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Değiştiriliyor…" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
