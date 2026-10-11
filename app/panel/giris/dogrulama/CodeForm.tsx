"use client";

import { useActionState } from "react";
import { verifyCodeAction } from "../../actions";
import { buttonClass, Field, inputClass } from "@/components/panel/ui";

export function CodeForm() {
  const [state, action, pending] = useActionState(verifyCodeAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Doğrulama kodu">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus className={`${inputClass} tracking-[0.4em]`} />
      </Field>
      {state?.error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Doğrulanıyor…" : "Devam"}
      </button>
    </form>
  );
}
