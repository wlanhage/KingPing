"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { FinaleSummary } from "@/lib/domain/finale";
import { CanvasBoundary } from "./weave3d/CanvasBoundary";

gsap.registerPlugin(ScrollTrigger);

/**
 * 3D-varianten av Kronans vandring, som en pinnad akt.
 *
 * Canvasen laddas dynamiskt utan SSR: three.js har inget i serverbundlen att göra,
 * och den väger tungt nog att den inte ska blockera resten av finalen.
 *
 * Scrollen skriver till en ref i stället för state — scenen läser den i sin egen
 * frame-loop, så vi slipper en React-render per bildruta.
 */
const CrownWeave3D = dynamic(
  () => import("./weave3d/CrownWeave3D").then((m) => m.CrownWeave3D),
  {
    ssr: false,
    loading: () => <p className="weave3d-loading">Väver kronans vandring…</p>,
  },
);

export function CrownWeave3DAct({
  summary,
  reduced,
}: {
  summary: FinaleSummary;
  reduced: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const progressRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top top",
        end: () => `+=${Math.max(2400, summary.transfers.length * 260)}`,
        pin: true,
        scrub: 0.4,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced, summary.transfers.length]);

  // Global felvakt kring WebGL. React-felgränser fångar BARA fel under rendering —
  // inte fel som kastas från en event-handler eller en rAF-loop, vilket är precis
  // var R3F kastar när WebGL-kontexten går förlorad. Utan den här vakten tar ett
  // sådant fel ner hela finalen ("Application error"), inte bara 3D-akten.
  useEffect(() => {
    if (reduced || !visible) return;
    const isWebglFailure = (msg: string) =>
      /getContextAttributes|reading 'alpha'|WebGL|THREE\.|context lost/i.test(msg);
    const onError = (e: ErrorEvent) => {
      if (isWebglFailure(e.message ?? '')) { e.preventDefault(); setGaveUp(true); }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isWebglFailure(String(e.reason?.message ?? e.reason ?? ''))) { e.preventDefault(); setGaveUp(true); }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [reduced, visible]);

  // Montera canvasen när akten närmar sig. IntersectionObserver i stället för
  // ScrollTriggers onEnter: det senare kräver en scrollhändelse, så en sida som
  // laddas redan nedskrollad hade fått en tom scen.
  useEffect(() => {
    if (reduced || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: "200% 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduced]);

  // Reduced motion: ingen pinning, ingen 3D — SVG-versionen är den tillgängliga vägen.
  // Samma sak om WebGL-kontexten gått förlorad: SVG-väven finns kvar i sidan och
  // bär innehållet, så vi degraderar tyst i stället för att visa en trasig canvas.
  if (reduced || gaveUp) return null;

  return (
    <section ref={ref} className="finale-act finale-weave3d" data-act="weave3d">
      <div className="weave3d-stage">
        {visible && (
          <CanvasBoundary onError={() => setGaveUp(true)}>
            <CrownWeave3D
              summary={summary}
              progressRef={progressRef}
              onContextLost={() => setGaveUp(true)}
              onReady={(api) => {
                // Endast i dev: gör scenen inspekterbar (och renderbar på begäran) från
                // konsolen. Utan den går scenen inte att verifiera i en miljö där
                // requestAnimationFrame inte tickar.
                if (process.env.NODE_ENV !== "production") {
                  (window as unknown as { __weave3d?: unknown }).__weave3d = {
                    ...api,
                    progressRef,
                  };
                }
              }}
            />
          </CanvasBoundary>
        )}
      </div>
      <div className="weave3d-caption">
        <p className="coldopen-dates">Kronans vandring</p>
        <p className="weave3d-hint">
          {summary.transfers.length} tronskiften · {summary.wrapped.defences}{" "}
          försvar
        </p>
      </div>
    </section>
  );
}
