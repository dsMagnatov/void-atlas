"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  posterFragmentShader,
  posterVertexShader,
  starFragmentShader,
  starVertexShader,
  tunnelFragmentShader,
  tunnelVertexShader,
} from "./tunnelShaders";

type TunnelExperienceProps = {
  videoSrc: string;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const normalized = clamp01((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
};

export default function TunnelExperience({ videoSrc }: TunnelExperienceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvasShell = canvasShellRef.current;
    const video = videoRef.current;

    if (!section || !canvasShell || !video) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      section.dataset.renderMode = "reduced";
      video.pause();
      return;
    }

    let disposed = false;
    let renderer: import("three").WebGLRenderer | undefined;
    let texture: import("three").VideoTexture | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let animationFrame = 0;
    let scrollTween:
      | {
          kill: () => void;
          scrollTrigger?: { kill: () => void };
        }
      | undefined;

    const setup = async () => {
      try {
        // Load the heavier rendering libraries only when motion and WebGL are
        // actually needed, keeping the static fallback lightweight.
        const [THREE, gsapModule, scrollTriggerModule] = await Promise.all([
          import("three"),
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        const { gsap } = gsapModule;
        const { ScrollTrigger } = scrollTriggerModule;

        if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve, reject) => {
            const handleReady = () => {
              video.removeEventListener("error", handleError);
              resolve();
            };
            const handleError = () => {
              video.removeEventListener("loadedmetadata", handleReady);
              reject(new Error("The tunnel video could not be loaded."));
            };

            video.addEventListener("loadedmetadata", handleReady, {
              once: true,
            });
            video.addEventListener("error", handleError, { once: true });
          });
        }
        if (disposed) return;

        await video.play().catch(() => undefined);

        const compactDevice =
          window.matchMedia("(max-width: 720px)").matches ||
          ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
            8) <= 4;

        // Renderer settings are intentionally conservative: no post-processing,
        // capped DPR, and fewer tube segments on compact or low-memory devices.
        renderer = new THREE.WebGLRenderer({
          alpha: false,
          antialias: !compactDevice,
          depth: true,
          powerPreference: "high-performance",
          stencil: false,
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x02060b, 1);
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, compactDevice ? 1.4 : 1.8),
        );
        renderer.autoClear = false;
        renderer.domElement.className = "tunnel__canvas";
        renderer.domElement.setAttribute("aria-hidden", "true");
        canvasShell.replaceChildren(renderer.domElement);

        // One live video texture feeds both the opening frame and the material
        // wrapped around the full tunnel interior.
        texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(54, 1, 0.08, 190);
        const posterScene = new THREE.Scene();
        const posterCamera = new THREE.Camera();

        // TUNNEL CREATION: the centerline bends gently in X/Y while moving deep
        // into Z. TubeGeometry turns that path into a continuous interior shell.
        const path = new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(0, 0, -6),
            new THREE.Vector3(0.3, 0.15, -18),
            new THREE.Vector3(-1.2, 0.65, -34),
            new THREE.Vector3(1.7, -0.8, -52),
            new THREE.Vector3(3.0, 0.4, -72),
            new THREE.Vector3(-2.0, 1.2, -94),
            new THREE.Vector3(1.2, -1.0, -118),
            new THREE.Vector3(0, 0.2, -145),
          ],
          false,
          "centripetal",
          0.42,
        );

        const tubeGeometry = new THREE.TubeGeometry(
          path,
          compactDevice ? 96 : 152,
          4.9,
          compactDevice ? 18 : 28,
          false,
        );
        const tunnelMaterial = new THREE.ShaderMaterial({
          fragmentShader: tunnelFragmentShader,
          side: THREE.BackSide,
          transparent: true,
          uniforms: {
            uProgress: { value: 0 },
            uTexture: { value: texture },
          },
          vertexShader: tunnelVertexShader,
        });
        const tunnel = new THREE.Mesh(tubeGeometry, tunnelMaterial);
        tunnel.frustumCulled = false;
        scene.add(tunnel);

        // TRANSITION FROM FLAT PLANE TO TUNNEL: this clip-space quad always
        // fills the viewport. Its shader opens a hole to the scene behind it.
        const posterGeometry = new THREE.PlaneGeometry(2, 2);
        const posterMaterial = new THREE.ShaderMaterial({
          depthTest: false,
          depthWrite: false,
          fragmentShader: posterFragmentShader,
          transparent: true,
          uniforms: {
            uImageSize: {
              value: new THREE.Vector2(video.videoWidth, video.videoHeight),
            },
            uProgress: { value: 0 },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uTexture: { value: texture },
          },
          vertexShader: posterVertexShader,
        });
        posterScene.add(new THREE.Mesh(posterGeometry, posterMaterial));

        const progressState = { value: 0 };
        const outsidePosition = new THREE.Vector3(0, 0, 0);
        const outsideLookAt = new THREE.Vector3(0, 0, -10);
        const curvePosition = new THREE.Vector3();
        const curveLookAt = new THREE.Vector3();
        const finalLookAt = new THREE.Vector3();
        const endPosition = path.getPointAt(1);
        const endTangent = path.getTangentAt(1).normalize();
        const exitPosition = endPosition
          .clone()
          .addScaledVector(endTangent, 12);
        const exitLookAt = endPosition
          .clone()
          .addScaledVector(endTangent, 28);

        // A sparse volume of cool stars sits beyond the tunnel mouth. The
        // seeded layout remains stable between reloads and matches the subtle
        // star-like detail in the center of the source video.
        const starCount = compactDevice ? 500 : 980;
        const starPositions = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        const starOpacities = new Float32Array(starCount);
        const starPhases = new Float32Array(starCount);
        const worldUp = new THREE.Vector3(0, 1, 0);
        const starRight = new THREE.Vector3()
          .crossVectors(endTangent, worldUp)
          .normalize();
        const starUp = new THREE.Vector3()
          .crossVectors(starRight, endTangent)
          .normalize();
        const starPosition = new THREE.Vector3();
        let randomSeed = 4729;
        const seededRandom = () => {
          randomSeed = (randomSeed * 16807) % 2147483647;
          return (randomSeed - 1) / 2147483646;
        };

        for (let index = 0; index < starCount; index += 1) {
          const depth = 18 + seededRandom() * 145;
          const radius =
            Math.pow(seededRandom(), 0.58) * (4.5 + depth * 0.38);
          const angle = seededRandom() * Math.PI * 2;

          starPosition
            .copy(endPosition)
            .addScaledVector(endTangent, depth)
            .addScaledVector(starRight, Math.cos(angle) * radius)
            .addScaledVector(starUp, Math.sin(angle) * radius);

          starPositions[index * 3] = starPosition.x;
          starPositions[index * 3 + 1] = starPosition.y;
          starPositions[index * 3 + 2] = starPosition.z;
          starSizes[index] =
            0.15 + seededRandom() * 0.2 +
            (seededRandom() > 0.965 ? 0.3 : 0);
          starOpacities[index] = 0.48 + seededRandom() * 0.48;
          starPhases[index] = seededRandom() * Math.PI * 2;
        }

        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(starPositions, 3),
        );
        starGeometry.setAttribute(
          "aSize",
          new THREE.BufferAttribute(starSizes, 1),
        );
        starGeometry.setAttribute(
          "aOpacity",
          new THREE.BufferAttribute(starOpacities, 1),
        );
        starGeometry.setAttribute(
          "aPhase",
          new THREE.BufferAttribute(starPhases, 1),
        );

        const starMaterial = new THREE.ShaderMaterial({
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fragmentShader: starFragmentShader,
          transparent: true,
          uniforms: {
            uTime: { value: 0 },
          },
          vertexShader: starVertexShader,
        });
        const stars = new THREE.Points(starGeometry, starMaterial);
        stars.frustumCulled = false;
        scene.add(stars);

        const starStartTime = performance.now();

        const renderFrame = () => {
          if (!renderer) return;

          const progress = clamp01(progressState.value);
          const cosmicProgress = clamp01(
            Number.parseFloat(
              document.documentElement.style.getPropertyValue(
                "--cosmic-progress",
              ),
            ) || 0,
          );
          const entrance = smoothstep(0.18, 0.38, progress);
          const travel = smoothstep(0.34, 0.9, progress);
          const exit = smoothstep(0.82, 1, progress);
          const curveT = 0.012 + travel * 0.955;
          const cosmicDistance = smoothstep(0, 1, cosmicProgress) * 92;

          posterMaterial.uniforms.uProgress.value = progress;
          tunnelMaterial.uniforms.uProgress.value = progress;
          starMaterial.uniforms.uTime.value =
            (performance.now() - starStartTime) * 0.001;

          // The final phase carries the camera through the open end of the
          // tunnel, expanding the dark exit until it fills the viewport.
          path.getPointAt(curveT, curvePosition);
          curvePosition.lerp(exitPosition, exit);
          camera.position.lerpVectors(outsidePosition, curvePosition, entrance);
          camera.position.addScaledVector(endTangent, cosmicDistance);

          path.getPointAt(Math.min(curveT + 0.022, 1), curveLookAt);
          curveLookAt.lerp(exitLookAt, exit);
          finalLookAt.lerpVectors(outsideLookAt, curveLookAt, entrance);
          finalLookAt.addScaledVector(endTangent, cosmicDistance);
          camera.lookAt(finalLookAt);
          camera.rotateZ(
            Math.sin(travel * Math.PI * 3.2) * 0.032 * entrance,
          );
          camera.fov = 54 + smoothstep(0.12, 0.5, progress) * 9 - travel * 4;
          camera.updateProjectionMatrix();

          section.style.setProperty("--tunnel-progress", progress.toFixed(4));
          renderer.clear();
          renderer.render(scene, camera);
          renderer.clearDepth();
          renderer.render(posterScene, posterCamera);
        };

        const resize = () => {
          if (!renderer) return;
          const width = Math.max(1, section.clientWidth);
          const height = Math.max(1, section.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          posterMaterial.uniforms.uResolution.value.set(width, height);
          renderFrame();
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(section);
        resize();

        // Scroll controls the journey while the render loop keeps the live
        // video texture moving even when the scroll position is stationary.
        gsap.registerPlugin(ScrollTrigger);
        scrollTween = gsap.to(progressState, {
          ease: "none",
          value: 1,
          onUpdate: renderFrame,
          scrollTrigger: {
            anticipatePin: 1,
            end: () =>
              `+=${Math.max(
                window.innerHeight * (compactDevice ? 4.4 : 5.6),
                3000,
              )}`,
            invalidateOnRefresh: true,
            pin: true,
            scrub: 0.45,
            start: "top top",
            trigger: section,
          },
        });

        section.classList.add("is-ready");
        canvasShell.classList.add("is-ready");
        section.dataset.renderMode = "webgl";
        const renderVideoFrame = () => {
          if (disposed) return;
          renderFrame();
          animationFrame = window.requestAnimationFrame(renderVideoFrame);
        };
        renderVideoFrame();
        ScrollTrigger.refresh();

        return () => {
          window.cancelAnimationFrame(animationFrame);
          scrollTween?.scrollTrigger?.kill();
          scrollTween?.kill();
          resizeObserver?.disconnect();
          tubeGeometry.dispose();
          tunnelMaterial.dispose();
          starGeometry.dispose();
          starMaterial.dispose();
          posterGeometry.dispose();
          posterMaterial.dispose();
        };
      } catch {
        if (!disposed) {
          section.dataset.renderMode = "fallback";
        }
      }
    };

    let disposeScene: (() => void) | undefined;
    void setup().then((cleanup) => {
      if (disposed) cleanup?.();
      else disposeScene = cleanup;
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      disposeScene?.();
      video.pause();
      texture?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [videoSrc]);

  const updateTitleBlur = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--blur-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--blur-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <>
      <div ref={canvasShellRef} className="tunnel__canvas-shell" />

      <section
        ref={sectionRef}
        id="experience"
        className="tunnel-experience"
        aria-label="Void Atlas — an immersive journey through deep space"
      >
        <video
          ref={videoRef}
          className="tunnel__fallback-video"
          src={videoSrc}
          autoPlay
          crossOrigin="anonymous"
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />

        <div className="cosmos-ui">
        <header className="cosmos-header">
          <a className="cosmos-brand" href="#experience" aria-label="Void Atlas home">
            <span className="cosmos-brand__mark" aria-hidden="true" />
            <span>Void Atlas</span>
          </a>

          <nav className="cosmos-nav" aria-label="Primary navigation">
            <a href="#experience">Mission</a>
            <a href="#experience">Signals</a>
            <a href="#experience">Archive</a>
            <a href="#experience">Field</a>
            <a href="#experience">About</a>
          </nav>

          <a className="cosmos-cta" href="#experience">
            <span>Enter atlas</span>
          </a>
        </header>

        <div className="cosmos-orbits" aria-hidden="true">
          <span className="cosmos-orbit cosmos-orbit--top" />
          <span className="cosmos-orbit cosmos-orbit--right" />
          <span className="cosmos-orbit cosmos-orbit--bottom" />
          <span className="cosmos-orbit cosmos-orbit--left" />
        </div>
        <p className="cosmos-signal">Light becomes landscape</p>

        <h1 className="cosmos-title" aria-label="The new map of deep space">
          <span
            className="cosmos-title__left"
            onPointerEnter={updateTitleBlur}
            onPointerMove={updateTitleBlur}
          >
            <span className="cosmos-title__sharp">
              The
              <br />
              new map
            </span>
            <span className="cosmos-title__blur-layer" aria-hidden="true">
              The
              <br />
              new map
            </span>
          </span>
          <span
            className="cosmos-title__middle"
            onPointerEnter={updateTitleBlur}
            onPointerMove={updateTitleBlur}
          >
            <span className="cosmos-title__sharp">of</span>
            <span className="cosmos-title__blur-layer" aria-hidden="true">of</span>
          </span>
          <span
            className="cosmos-title__right"
            onPointerEnter={updateTitleBlur}
            onPointerMove={updateTitleBlur}
          >
            <span className="cosmos-title__sharp">
              deep
              <br />
              space
            </span>
            <span className="cosmos-title__blur-layer" aria-hidden="true">
              deep
              <br />
              space
            </span>
          </span>
        </h1>

        <p className="cosmos-manifesto">
          An immersive atlas that turns distant light into places you can move through.
        </p>

        <ol className="cosmos-stages" aria-label="Journey stages">
          <li><span>Known sky</span><strong>01</strong></li>
          <li><span>Signal drift</span><strong>02</strong></li>
          <li><span>Threshold</span><strong>03</strong></li>
          <li><span>Deep field</span><strong>04</strong></li>
          <li><span>Beyond</span><strong>05</strong></li>
        </ol>
        </div>
      </section>
    </>
  );
}
