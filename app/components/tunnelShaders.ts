/**
 * The poster shader keeps the source image crisp at progress 0, then pulls its
 * pixels toward a rounded central aperture. The tunnel is rendered underneath,
 * so opening the poster reveals real geometry rather than a second flat layer.
 */
export const posterVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const posterFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform float uProgress;

  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    float viewportAspect = uResolution.x / max(uResolution.y, 1.0);
    float imageAspect = uImageSize.x / max(uImageSize.y, 1.0);
    vec2 visibleArea = vec2(1.0);

    if (viewportAspect > imageAspect) {
      visibleArea.y = imageAspect / viewportAspect;
    } else {
      visibleArea.x = viewportAspect / imageAspect;
    }

    return (uv - 0.5) * visibleArea + 0.5;
  }

  void main() {
    float zoomPhase = smoothstep(0.0, 0.20, uProgress);
    float collapsePhase = smoothstep(0.12, 0.54, uProgress);
    float posterScale = mix(1.0, 1.075, zoomPhase);

    vec2 uv = coverUv(vUv);
    uv = 0.5 + (uv - 0.5) / posterScale;

    // A superellipse echoes the rectangular opening already present in the art.
    vec2 aperturePosition = vUv - 0.5;
    aperturePosition.x *= uResolution.x / max(uResolution.y, 1.0);
    aperturePosition.y *= 1.14;
    float apertureDistance = pow(
      pow(abs(aperturePosition.x), 4.0) +
      pow(abs(aperturePosition.y), 4.0),
      0.25
    );

    float aperture = mix(-0.11, 0.78, collapsePhase);
    float stretchBand =
      smoothstep(aperture, aperture + 0.34, apertureDistance) *
      (1.0 - smoothstep(aperture + 0.34, aperture + 0.72, apertureDistance));

    // Pull samples inward around the opening to make the image feel elastic.
    vec2 pullDirection = normalize((uv - 0.5) + vec2(0.00001));
    uv -= pullDirection * stretchBand * collapsePhase * 0.058;

    vec4 source = texture2D(uTexture, clamp(uv, 0.0, 1.0));
    float rim = 1.0 - smoothstep(0.0, 0.06, abs(apertureDistance - aperture));
    source.rgb *= 1.0 - rim * collapsePhase * 0.48;

    float outsideAperture = smoothstep(
      aperture,
      aperture + 0.078,
      apertureDistance
    );
    float finalFade = 1.0 - smoothstep(0.74, 0.96, uProgress);
    float alpha = outsideAperture * finalFade;

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(source.rgb, alpha);
  }
`;

/**
 * TubeGeometry already supplies the curved path. This vertex shader adds a
 * restrained, scroll-driven ripple so the tunnel feels organic without a
 * perpetual animation loop.
 */
export const tunnelVertexShader = /* glsl */ `
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    float reveal = smoothstep(0.12, 0.38, uProgress);
    float ripple = (
      sin(uv.x * 58.0 + uv.y * 9.0) +
      0.55 * sin(uv.x * 31.0 - uv.y * 17.0)
    ) * 0.055 * reveal;

    vec3 displaced = position + normal * ripple;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const tunnelFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    // Repeating the one source image along the path wraps it over every wall.
    vec2 textureUv = vec2(
      fract(vUv.x * 3.15 + uProgress * 0.035),
      fract(vUv.y + sin(vUv.x * 25.0) * 0.012)
    );

    vec3 color = texture2D(uTexture, textureUv).rgb;
    float perimeterLight = 0.80 + 0.20 * cos((vUv.y - 0.5) * 6.2831853);
    float depthVariation = 0.90 + 0.10 * sin(vUv.x * 32.0 + vUv.y * 7.0);
    color *= perimeterLight * depthVariation;

    float reveal = smoothstep(0.08, 0.30, uProgress);
    float exitFade = 1.0 - smoothstep(0.94, 1.0, uProgress);
    gl_FragColor = vec4(color, reveal * exitFade);
  }
`;

/**
 * A restrained procedural star field continues the dark space visible in the
 * source video. Points stay soft and blue rather than reading as bright UI.
 */
export const starVertexShader = /* glsl */ `
  attribute float aOpacity;
  attribute float aPhase;
  attribute float aSize;

  uniform float uTime;

  varying float vOpacity;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.88 + 0.12 * sin(uTime * 0.48 + aPhase);

    vOpacity = min(1.0, aOpacity * pulse * 1.1);
    gl_PointSize = clamp(
      aSize * (260.0 / max(1.0, -viewPosition.z)),
      0.9,
      4.8
    );
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const starFragmentShader = /* glsl */ `
  precision highp float;

  varying float vOpacity;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float glow = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
    float core = 1.0 - smoothstep(0.0, 0.12, distanceToCenter);
    float alpha = (glow * 0.72 + core * 0.55) * vOpacity;

    if (alpha < 0.01) discard;

    vec3 edgeColor = vec3(0.42, 0.62, 0.88);
    vec3 coreColor = vec3(0.90, 0.95, 1.0);
    gl_FragColor = vec4(mix(edgeColor, coreColor, core), alpha);
  }
`;
