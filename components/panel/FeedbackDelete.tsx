"use client";

import { useTransition } from "react";
import { deleteFeedbackAction } from "@/app/panel/actions";

export function FeedbackDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await deleteFeedbackAction(id)))}
      className="text-[13px] text-antrasit-50 underline underline-offset-2 hover:text-[#9a3b31] disabled:opacity-50"
    >
      Sil
    </button>
  );
}
