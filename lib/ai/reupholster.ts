// Faz 3 — "Kendi koltuğunuzda görün": the customer photographs their own
// sofa, the service returns the same photo re-covered in an ORMEN fabric.
//
// ONLY THE INTERFACE AND A MOCK LIVE HERE. There is no real AI service and
// no paid API call anywhere in Faz 1 (brief: "gerçek AI çağrısı yok").
// The mock lets the UI and tests be built against a stable contract.

import type { Fabric } from "@/lib/types";

export interface ReupholsterRequest {
  /** The customer's photo (JPEG/PNG/WebP), kept only for the request. */
  photo: Blob;
  fabric: Pick<Fabric, "code" | "texture">;
  /** Optional mask of the upholstered area; the service segments it otherwise. */
  mask?: Blob;
}

export type ReupholsterResult =
  | { ok: true; image: Blob; fabricCode: string; note: string }
  | { ok: false; reason: "not_available" | "no_furniture_found" | "photo_too_small" | "failed"; message: string };

export interface ReupholsterService {
  readonly available: boolean;
  reupholster(req: ReupholsterRequest): Promise<ReupholsterResult>;
}

/** The only implementation in Faz 1: says "coming soon", touches nothing. */
export class MockReupholsterService implements ReupholsterService {
  readonly available = false;
  async reupholster(req: ReupholsterRequest): Promise<ReupholsterResult> {
    void req;
    return { ok: false, reason: "not_available", message: "Kendi koltuğunuzun fotoğrafında deneme yakında." };
  }
}

export const reupholsterService: ReupholsterService = new MockReupholsterService();
