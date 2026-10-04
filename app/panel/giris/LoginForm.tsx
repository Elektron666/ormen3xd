"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { buttonClass, Field, inputClass } from "@/components/panel/ui";

export function LoginForm({ demoHint }: { demoHint: string | null }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="E-posta">
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Şifre">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state?.error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      {demoHint && <p className="text-[12px] leading-snug text-antrasit-50">{demoHint}</p>}
    </form>
  );
}
