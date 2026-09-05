"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type SpatialProperties = CSSProperties & {
  "--x": string;
  "--y": string;
  "--z": string;
  "--rx": string;
  "--ry": string;
  "--rz": string;
};

type SpatialText = {
  key: string;
  text: string;
  kind: "near" | "phrase" | "micro";
  x: string;
  y: string;
  z: string;
  rx?: string;
  ry?: string;
  rz?: string;
};

const spatialTexts: SpatialText[] = [
  {
    key: "deep-field",
    text: "DEEP FIELD",
    kind: "phrase",
    x: "-46vw",
    y: "-55vh",
    z: "-220px",
    rx: "-2deg",
    ry: "17deg",
    rz: "-2deg",
  },
  {
    key: "unknown-coordinates",
    text: "UNKNOWN COORDINATES",
    kind: "phrase",
    x: "-44vw",
    y: "58vh",
    z: "-360px",
    rx: "3deg",
    ry: "12deg",
    rz: "-1deg",
  },
  {
    key: "signal-drift",
    text: "SIGNAL DRIFT",
    kind: "phrase",
    x: "45vw",
    y: "-56vh",
    z: "-430px",
    rx: "-3deg",
    ry: "-14deg",
    rz: "2deg",
  },
  {
    key: "mapped-light",
    text: "MAPPED LIGHT",
    kind: "phrase",
    x: "46vw",
    y: "54vh",
    z: "-500px",
    rx: "-7deg",
    ry: "-13deg",
    rz: "4deg",
  },
  {
    key: "beyond-noise",
    text: "BEYOND NOISE",
    kind: "phrase",
    x: "55vw",
    y: "8vh",
    z: "-620px",
    rx: "8deg",
    ry: "11deg",
    rz: "2deg",
  },
  {
    key: "atlas-layer",
    text: "ATLAS LAYER",
    kind: "phrase",
    x: "-52vw",
    y: "-23vh",
    z: "-520px",
    rx: "-5deg",
    ry: "-16deg",
    rz: "-2deg",
  },
  {
    key: "edge-of-silence",
    text: "EDGE OF SILENCE",
    kind: "phrase",
    x: "-56vw",
    y: "23vh",
    z: "-560px",
    rx: "4deg",
    ry: "15deg",
    rz: "2deg",
  },
  {
    key: "orbital-memory",
    text: "ORBITAL MEMORY",
    kind: "phrase",
    x: "20vw",
    y: "-61vh",
    z: "-580px",
    rx: "-4deg",
    ry: "-12deg",
    rz: "-2deg",
  },
  {
    key: "light-without-origin",
    text: "LIGHT WITHOUT ORIGIN",
    kind: "phrase",
    x: "-20vw",
    y: "61vh",
    z: "-660px",
    rx: "-5deg",
    ry: "8deg",
    rz: "-3deg",
  },
  {
    key: "field-01",
    text: "FIELD 01",
    kind: "micro",
    x: "-28vw",
    y: "-64vh",
    z: "-460px",
    rz: "-4deg",
  },
  {
    key: "signal-02",
    text: "SIGNAL 02",
    kind: "micro",
    x: "34vw",
    y: "-61vh",
    z: "-520px",
    rz: "3deg",
  },
  {
    key: "threshold-03",
    text: "THRESHOLD 03",
    kind: "micro",
    x: "-25vw",
    y: "63vh",
    z: "-440px",
    rz: "-2deg",
  },
  {
    key: "atlas-04",
    text: "ATLAS 04",
    kind: "micro",
    x: "10vw",
    y: "-67vh",
    z: "-560px",
    rz: "2deg",
  },
  {
    key: "beyond-05",
    text: "BEYOND 05",
    kind: "micro",
    x: "32vw",
    y: "64vh",
    z: "-500px",
    rz: "-3deg",
  },
  {
    key: "vector-06",
    text: "VECTOR 06",
    kind: "micro",
    x: "-58vw",
    y: "4vh",
    z: "-520px",
    rz: "3deg",
  },
  {
    key: "orbit-07",
    text: "ORBIT 07",
    kind: "micro",
    x: "55vw",
    y: "-42vh",
    z: "-400px",
    rz: "-2deg",
  },
  {
    key: "echo-08",
    text: "ECHO 08",
    kind: "micro",
    x: "8vw",
    y: "66vh",
    z: "-580px",
    rz: "4deg",
  },
];

const spatialStyle = (item: SpatialText): SpatialProperties => ({
  "--x": item.x,
  "--y": item.y,
  "--z": item.z,
  "--rx": item.rx ?? "0deg",
  "--ry": item.ry ?? "0deg",
  "--rz": item.rz ?? "0deg",
});

export default function CosmicTypographyField() {
  const sectionRef = useRef<HTMLElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const portalPreviewRef = useRef<HTMLDivElement>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const world = worldRef.current;
    const portalPreview = portalPreviewRef.current;

    if (!section || !world || !portalPreview) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.dataset.motion = "reduced";
      return;
    }

    let disposed = false;
    let animationContext: { revert: () => void } | undefined;
    let tunnelObserver: MutationObserver | undefined;
    let portalProgressObserver: MutationObserver | undefined;
    let releaseTunnelWait: (() => void) | undefined;

    const waitForTunnelPin = () => {
      const tunnel = document.querySelector<HTMLElement>(".tunnel-experience");

      if (
        !tunnel ||
        tunnel.classList.contains("is-ready") ||
        Boolean(tunnel.dataset.renderMode)
      ) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const finish = () => {
          tunnelObserver?.disconnect();
          tunnelObserver = undefined;
          releaseTunnelWait = undefined;
          resolve();
        };

        releaseTunnelWait = finish;
        tunnelObserver = new MutationObserver(() => {
          if (
            tunnel.classList.contains("is-ready") ||
            Boolean(tunnel.dataset.renderMode)
          ) {
            finish();
          }
        });
        tunnelObserver.observe(tunnel, {
          attributeFilter: ["class", "data-render-mode"],
          attributes: true,
        });

        if (
          tunnel.classList.contains("is-ready") ||
          Boolean(tunnel.dataset.renderMode)
        ) {
          finish();
        }
      });
    };

    const setup = async () => {
      await waitForTunnelPin();
      if (disposed) return;

      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (disposed) return;

      const { gsap } = gsapModule;
      const { ScrollTrigger } = scrollTriggerModule;
      gsap.registerPlugin(ScrollTrigger);

      animationContext = gsap.context(() => {
        const select = gsap.utils.selector(portalPreview);
        const layers = select<HTMLElement>("[data-scene-layer]");
        const phrases = select<HTMLElement>(".cosmic-field__phrase");
        const phraseInners = select<HTMLElement>(
          ".cosmic-field__phrase .cosmic-field__layer-inner",
        );
        const microLabels = select<HTMLElement>(".cosmic-field__micro");
        const portalCopy = portalPreview.querySelector<HTMLElement>(
          ".cosmic-portal-preview__copy--primary",
        );
        const secondaryCopy = portalPreview.querySelector<HTMLElement>(
          ".cosmic-portal-preview__copy--secondary",
        );
        const feedbackForm = portalPreview.querySelector<HTMLElement>(
          ".cosmic-feedback",
        );
        const tunnel = document.querySelector<HTMLElement>(".tunnel-experience");

        if (!portalCopy || !secondaryCopy || !feedbackForm) return;

        if (tunnel) {
          const syncPortalProgress = () => {
            const progress = tunnel.style.getPropertyValue("--tunnel-progress") || "0";
            const numericProgress = Number.parseFloat(progress) || 0;
            const revealProgress = Math.min(
              1,
              Math.max(0, (numericProgress - 0.9) / 0.1),
            );
            const reveal =
              revealProgress * revealProgress * (3 - 2 * revealProgress);
            portalPreview.style.setProperty("--portal-progress", progress);
            portalPreview.style.setProperty("--portal-reveal", reveal.toFixed(4));
            portalPreview.style.setProperty(
              "--portal-title-scale",
              (0.56 + reveal * 0.44).toFixed(4),
            );
            portalPreview.style.setProperty(
              "--portal-title-blur",
              `${((1 - reveal) * 7).toFixed(2)}px`,
            );
          };

          portalProgressObserver = new MutationObserver(syncPortalProgress);
          portalProgressObserver.observe(tunnel, {
            attributeFilter: ["style"],
            attributes: true,
          });
          syncPortalProgress();
        }

        gsap.set(layers, { autoAlpha: 0 });
        gsap.set(world, { autoAlpha: 1 });
        gsap.set(phrases, {
          autoAlpha: 0,
          filter: "blur(5px)",
        });
        gsap.set(microLabels, {
          autoAlpha: 0,
          filter: "blur(4px)",
        });
        gsap.set(portalCopy, {
          autoAlpha: 0,
          filter: "blur(8px)",
          rotationY: -5,
          scale: 0.5,
        });
        gsap.set(secondaryCopy, {
          autoAlpha: 0,
          filter: "blur(8px)",
          rotationY: 7,
          scale: 0.42,
          xPercent: 8,
          yPercent: 3,
        });
        gsap.set(feedbackForm, {
          autoAlpha: 0,
          filter: "blur(5px)",
          pointerEvents: "none",
          scale: 0.92,
          y: 32,
        });
        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            anticipatePin: 0,
            end: () =>
              `+=${Math.max(window.innerHeight * 7.2, 4800)}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              document.documentElement.style.setProperty(
                "--cosmic-progress",
                self.progress.toFixed(4),
              );
            },
            onEnter: () => {
              gsap.set(portalPreview, { autoAlpha: 1 });
            },
            onEnterBack: () => {
              gsap.set(portalPreview, { autoAlpha: 1 });
            },
            onLeave: () => {
              document.documentElement.style.setProperty(
                "--cosmic-progress",
                "1",
              );
              gsap.set(portalPreview, { autoAlpha: 1 });
            },
            onLeaveBack: () => {
              gsap.set(portalPreview, { clearProps: "opacity,visibility" });
            },
            pin: true,
            refreshPriority: -1,
            scrub: 0.8,
            start: "top top",
            trigger: section,
          },
        });

        const seededBeat = (index: number, salt: number) => {
          const value =
            Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
          return value - Math.floor(value);
        };

        phrases.forEach((phrase, index) => {
          const revealAt = 0.02 + seededBeat(index, 1) * 0.85;
          const brightAt = 4.3 + seededBeat(index, 2) * 7.2;
          const fadeAt = 13 + seededBeat(index, 3) * 0.7;

          timeline
            .to(
              phrase,
              {
                autoAlpha: 0.58,
                duration: 0.55,
                ease: "power2.out",
                filter: "blur(0px)",
              },
              revealAt,
            )
            .to(
              phrase,
              { autoAlpha: 1, duration: 0.55, ease: "power2.out" },
              brightAt,
            )
            .to(
              phrase,
              { autoAlpha: 0.64, duration: 0.85, ease: "power1.inOut" },
              brightAt + 0.55,
            )
            .to(
              phrase,
              {
                autoAlpha: 0,
                duration: 0.9,
                filter: "blur(10px)",
              },
              fadeAt,
            );
        });

        microLabels.forEach((label, index) => {
          const revealAt = 0.04 + seededBeat(index, 4) * 1.05;
          const brightAt = 4.8 + seededBeat(index, 5) * 6.8;
          const fadeAt = 13 + seededBeat(index, 6) * 0.65;

          timeline
            .to(
              label,
              {
                autoAlpha: 0.42,
                duration: 0.5,
                ease: "power2.out",
                filter: "blur(0px)",
              },
              revealAt,
            )
            .to(
              label,
              { autoAlpha: 1, duration: 0.45, ease: "power2.out" },
              brightAt,
            )
            .to(
              label,
              { autoAlpha: 0.5, duration: 0.75, ease: "power1.inOut" },
              brightAt + 0.45,
            )
            .to(
              label,
              {
                autoAlpha: 0,
                duration: 0.8,
                filter: "blur(8px)",
              },
              fadeAt,
            );
        });

        timeline
          .fromTo(
            world,
            { force3D: true, rotationX: 0.8, rotationY: -2.4, z: -260 },
            {
              duration: 15.2,
              force3D: true,
              rotationX: -1.4,
              rotationY: 4.2,
              z: 980,
            },
            0,
          )
          .to(
            portalCopy,
            {
              autoAlpha: 1,
              duration: 0.9,
              filter: "blur(0px)",
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scale: 1.15,
              xPercent: 0,
              yPercent: 0,
            },
            2.25,
          )
          .to(
            portalCopy,
            {
              duration: 3.9,
              filter: "blur(0px)",
              rotationX: 2,
              rotationY: -12,
              rotationZ: -1.35,
              scale: 5.4,
              xPercent: -12,
              yPercent: -3,
            },
            3.15,
          )
          .to(
            portalCopy,
            {
              autoAlpha: 0,
              duration: 1.1,
              filter: "blur(6px)",
            },
            6.7,
          )
          .to(
            secondaryCopy,
            {
              autoAlpha: 1,
              duration: 1.05,
              filter: "blur(0px)",
              rotationY: 0,
              scale: 1,
              xPercent: 0,
              yPercent: 0,
            },
            7.65,
          )
          .to(
            secondaryCopy,
            {
              duration: 3.6,
              rotationX: -2,
              rotationY: 11,
              rotationZ: 1.1,
              scale: 5.3,
              xPercent: 12,
              yPercent: -3,
            },
            8.55,
          )
          .to(
            secondaryCopy,
            {
              autoAlpha: 0,
              duration: 0.75,
              filter: "blur(7px)",
            },
            12.2,
          )
          .set(feedbackForm, { pointerEvents: "auto" }, 13)
          .to(
            feedbackForm,
            {
              autoAlpha: 1,
              duration: 1,
              filter: "blur(0px)",
              scale: 1,
              y: 0,
            },
            13,
          )
          .to(
            phraseInners,
            {
              duration: 13.1,
              rotation: (index) => (index % 2 === 0 ? -2.5 : 2.5),
              xPercent: (index) =>
                [-20, -14, 18, 15, 21, -17, -24, 8, 24, -11][index] ?? 0,
              yPercent: (index) =>
                [-5, 8, -7, 6, 3, -8, 4, -9, 7, 5][index] ?? 0,
            },
            0,
          )
          .to(
            microLabels,
            {
              duration: 13.1,
              xPercent: (index) => (index % 2 === 0 ? -12 : 14),
              yPercent: (index) => (index % 3 === 0 ? -8 : 7),
            },
            0,
          );

        section.dataset.motion = "scroll";
      }, section);

      ScrollTrigger.refresh();
    };

    setup().catch(() => {
      section.dataset.motion = "static";
    });

    return () => {
      disposed = true;
      releaseTunnelWait?.();
      tunnelObserver?.disconnect();
      portalProgressObserver?.disconnect();
      document.documentElement.style.removeProperty("--cosmic-progress");
      animationContext?.revert();
    };
  }, []);

  return (
    <>
      <div
        ref={portalPreviewRef}
        className="cosmic-portal-preview"
      >
        <div className="cosmic-field__stage" aria-hidden="true">
          <div ref={worldRef} className="cosmic-field__world">
            {spatialTexts.map((item) => (
              <div
                key={item.key}
                className={`cosmic-field__layer cosmic-field__${item.kind}`}
                data-scene-key={item.key}
                data-scene-layer
                style={spatialStyle(item)}
                aria-hidden="true"
              >
                <span className="cosmic-field__layer-inner">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="cosmic-portal-preview__copy cosmic-portal-preview__copy--primary"
          aria-hidden="true"
        >
          <p className="cosmic-portal-preview__title">
            <span data-text="WE TURN THE">WE TURN THE</span>
            <span data-text="UNKNOWN">UNKNOWN</span>
            <span data-text="INTO A MAP">INTO A MAP</span>
          </p>
        </div>

        <div
          className="cosmic-portal-preview__copy cosmic-portal-preview__copy--secondary"
          aria-hidden="true"
        >
          <p className="cosmic-portal-preview__title">
            <span data-text="EVERY SIGNAL">EVERY SIGNAL</span>
            <span data-text="BECOMES">BECOMES</span>
            <span data-text="A DIRECTION">A DIRECTION</span>
          </p>
        </div>

        <form
          className="cosmic-feedback"
          onSubmit={(event) => {
            event.preventDefault();
            setFeedbackSent(true);
          }}
        >
          <p className="cosmic-feedback__eyebrow">OPEN CHANNEL / FIELD 09</p>
          <h3>TRANSMIT A SIGNAL</h3>
          <div className="cosmic-feedback__row">
            <label>
              <span>NAME</span>
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label>
              <span>EMAIL</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
          </div>
          <label>
            <span>MESSAGE</span>
            <textarea name="message" rows={3} required />
          </label>
          <button type="submit" disabled={feedbackSent}>
            {feedbackSent ? "SIGNAL RECEIVED" : "SEND SIGNAL"}
          </button>
        </form>
      </div>

      <section
        ref={sectionRef}
        id="field"
        className="cosmic-field"
        aria-labelledby="cosmic-field-title"
      >
        <h2 id="cosmic-field-title" className="cosmic-field__sr-only">
          WE TURN THE UNKNOWN INTO A MAP
        </h2>
      </section>
    </>
  );
}
