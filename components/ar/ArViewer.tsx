"use client";

import { useEffect, useRef, useState } from "react";
import type { Fabric, FurnitureModel } from "@/lib/types";
import { arGlb } from "@/lib/ar/build";
import { currentArDevice } from "@/lib/ar/device";

// One piece of furniture in one ORMEN fabric, in <model-viewer>: a 3D preview
// on any screen, and "Odamda gör" on phones that can do AR (Android: WebXR /
// Scene Viewer, iPhone: Quick Look, which model-viewer feeds a USDZ it makes
// from our GLB). model-viewer is loaded only when this component mounts.

type State = { kind: "loading" } | { kind: "ready"; src: string } | { kind: "error"; message: string };

interface ModelViewerElement extends HTMLElement {
  canActivateAR?: boolean;
}

export function ArViewer({ model, fabric, className = "" }: { model: FurnitureModel; fabric: Fabric; className?: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [arReady, setArReady] = useState<boolean | null>(null);
  const [arFailed, setArFailed] = useState(false);
  const ref = useRef<ModelViewerElement>(null);
  const device = typeof navigator === "undefined" ? "desktop" : currentArDevice();

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    Promise.all([import("@google/model-viewer"), arGlb(model, fabric)])
      .then(([, glb]) => {
        if (!alive) return;
        url = URL.createObjectURL(glb);
        setState({ kind: "ready", src: url });
      })
      .catch((e: unknown) => {
        if (alive) setState({ kind: "error", message: e instanceof Error ? e.message : "Model hazırlanamadı." });
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [model, fabric]);

  useEffect(() => {
    const el = ref.current;
    if (!el || state.kind !== "ready") return;
    const onLoad = () => setArReady(!!el.canActivateAR);
    const onStatus = (e: Event) => {
      if ((e as CustomEvent<{ status: string }>).detail?.status === "failed") setArFailed(true);
    };
    el.addEventListener("load", onLoad);
    el.addEventListener("ar-status", onStatus);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("ar-status", onStatus);
    };
  }, [state]);

  return (
    <div className={`studio-backdrop relative overflow-hidden rounded-2xl ${className}`}>
      {state.kind === "ready" ? (
        <model-viewer
          ref={ref}
          src={state.src}
          alt={`${model.name}, ${fabric.code} kumaşıyla`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="fixed"
          ar-placement="floor"
          camera-controls
          touch-action="pan-y"
          shadow-intensity="1"
          shadow-softness="0.8"
          environment-image="neutral"
          exposure="1"
          interaction-prompt="none"
          data-testid="ar-viewer"
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <button
            slot="ar-button"
            type="button"
            className="absolute bottom-4 left-1/2 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 text-[15px] text-accent-ink shadow-lg"
          >
            Odamda gör
          </button>
        </model-viewer>
      ) : state.kind === "loading" ? (
        <div className="flex h-full items-center justify-center text-[14px] text-antrasit-50" role="status">
          Model kumaşıyla hazırlanıyor…
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-[14px] text-[#9a3b31]" role="alert">
          {state.message}
        </div>
      )}
      {state.kind === "ready" && device !== "desktop" && (arReady === false || arFailed) && (
        <p className="absolute inset-x-4 bottom-4 rounded-xl bg-kagit/95 px-3 py-2 text-center text-[13px] text-antrasit-70">
          {device === "ios"
            ? "Bu cihazda AR açılamadı. Safari ile açtığınızdan emin olun."
            : "Bu telefon AR desteklemiyor ya da Google Play Hizmetleri (AR) yüklü değil. Modeli burada döndürerek inceleyebilirsiniz."}
        </p>
      )}
    </div>
  );
}
