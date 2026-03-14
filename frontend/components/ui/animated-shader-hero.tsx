"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GradientButton } from "./gradient-button";

// ---------------------------------------------------------------------------
// GLSL shaders
// ---------------------------------------------------------------------------
const VERT_SRC = `#version 300 es
precision highp float;
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;

out vec4 fragColor;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 74.5);
  return fract(p.x * p.y);
}

float hash1(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),             hash(i + vec2(1,0)), u.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 7; i++) {
    v += a * noise(p);
    p  = rot(0.37) * p * 2.13 + vec2(0.7, 1.3);
    a *= 0.5;
  }
  return v;
}

float warpedFbm(vec2 p, float t) {
  vec2 q = vec2(
    fbm(p + vec2(t * 0.08, t * 0.04)),
    fbm(p + vec2(t * 0.05, t * 0.09) + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.06),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.03)
  );
  return fbm(p + 4.0 * r);
}

// Light streak: a bright elongated ray with a glowing core and soft tail
float streak(vec2 uv, vec2 tip, float angle, float len, float coreW, float glowW) {
  vec2 dir  = vec2(cos(angle), sin(angle));
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 rel  = uv - tip;

  float along  = dot(rel, dir);
  float across = abs(dot(rel, perp));

  // Only draw behind the tip (tail extends in -dir)
  if (along > 0.0 || along < -len) return 0.0;

  float t = clamp(-along / len, 0.0, 1.0);   // 0 at tip, 1 at tail end
  float w = mix(coreW * 0.3, glowW, t);

  float glow = smoothstep(w * 2.5, 0.0, across) * (1.0 - t * 0.7);
  float core = smoothstep(coreW,   0.0, across) * (1.0 - t * 0.5);

  return glow * 0.5 + core;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  // ---- base colour ----
  vec3 col = vec3(0.005, 0.008, 0.028);

  // ---- primary nebula ----
  float f1 = warpedFbm(uv * 1.6 + vec2(0.0, t * 0.018), t);
  vec3 neb1 = mix(vec3(0.01, 0.02, 0.08),  vec3(0.06, 0.03, 0.30),  smoothstep(0.30, 0.50, f1));
  neb1      = mix(neb1, vec3(0.18, 0.08, 0.62),                       smoothstep(0.50, 0.68, f1));
  neb1      = mix(neb1, vec3(0.40, 0.22, 0.90),                       smoothstep(0.68, 0.82, f1));
  col = mix(col, neb1, 0.95);

  // ---- secondary nebula layer ----
  float f2 = warpedFbm(uv * 2.2 + vec2(4.5, 1.8) + vec2(t * 0.012, t * 0.020), t * 0.5);
  vec3 neb2 = mix(vec3(0.02, 0.02, 0.10), vec3(0.08, 0.12, 0.55), smoothstep(0.38, 0.72, f2));
  col = mix(col, neb2, smoothstep(0.38, 0.72, f2) * 0.55);

  // ---- light streaks ----
  // Each streak has its tip travel right-to-left across the screen on a cycle.
  // angle is slightly downward (negative y in screen space).
  for (int i = 0; i < 6; i++) {
    float fi    = float(i);
    float spd   = 0.05  + hash1(fi * 3.71) * 0.07;    // cycle speed
    float len   = 0.20  + hash1(fi * 9.13) * 0.30;    // streak length
    float coreW = 0.001 + hash1(fi * 6.77) * 0.001;   // core half-width
    float glowW = coreW * 4.0;
    float yBase = (hash1(fi * 5.29) - 0.5) * 0.65;    // vertical spread
    float ang   = -0.08 + (hash1(fi * 2.17) - 0.5) * 0.12; // near-horizontal angle
    float phase = hash1(fi * 11.3);

    float prog  = fract(t * spd + phase);              // 0→1 per cycle
    // tip travels right-to-left; start slightly off-screen right
    float tipX  = 1.4 - prog * (1.4 + len + 0.2);
    float tipY  = yBase;
    vec2 tip    = vec2(tipX, tipY);

    float s     = streak(uv, tip, ang + 3.14159, len, coreW, glowW);

    // Fade in/out at cycle edges to avoid popping
    float fade  = smoothstep(0.0, 0.05, prog) * smoothstep(1.0, 0.92, prog);

    vec3 streakCol = mix(vec3(0.75, 0.82, 1.00), vec3(0.55, 0.65, 1.00), hash1(fi * 4.4));
    col += streakCol * s * fade * 2.2;
  }

  // ---- subtle centre glow ----
  float glow = 0.05 / (length(uv * vec2(0.9, 1.1)) + 0.18);
  col += vec3(0.18, 0.10, 0.65) * glow * 0.7;

  // ---- vignette ----
  float vig = 1.0 - smoothstep(0.45, 1.35, length(uv * vec2(0.75, 1.1)));
  col *= vig;

  // ---- tone map + gamma ----
  col = col / (col + 0.75);
  col = pow(col, vec3(0.88));

  fragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// WebGL renderer
// ---------------------------------------------------------------------------
class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uTime: WebGLUniformLocation | null;
  private uRes: WebGLUniformLocation | null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    const vs = this.compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    this.program = prog;

    this.uTime = gl.getUniformLocation(prog, "u_time");
    this.uRes  = gl.getUniformLocation(prog, "u_resolution");

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  private compile(type: number, src: string): WebGLShader {
    const { gl } = this;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  render(time: number) {
    const { gl, program } = this;
    gl.useProgram(program);
    gl.uniform1f(this.uTime, time);
    gl.uniform2f(this.uRes, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(w: number, h: number) {
    this.gl.viewport(0, 0, w, h);
  }
}

// ---------------------------------------------------------------------------
// useShaderBackground hook
// ---------------------------------------------------------------------------
function useShaderBackground(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer(canvas);
    } catch {
      return;
    }

    const setSize = () => {
      canvas.width  = canvas.offsetWidth  * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      renderer.resize(canvas.width, canvas.height);
    };
    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);

    let raf: number;
    const start = performance.now();
    const tick = () => {
      renderer.render((performance.now() - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef]);
}

// ---------------------------------------------------------------------------
// Hero component
// ---------------------------------------------------------------------------
interface HeroProps {
  headline?: { line1: string; line2: string };
  subtitle?: string;
  badge?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function Hero({
  headline       = { line1: "StratoTrack", line2: "Into Orbit" },
  subtitle       = "Plan projects, track tasks, and stay aligned — with a clean, focused workflow.",
  badge          = "Project Management Reimagined",
  primaryLabel   = "Sign in",
  primaryHref    = "/login",
  secondaryLabel = "Create account",
  secondaryHref  = "/signup",
}: HeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useShaderBackground(canvasRef);
  const router = useRouter();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#05081a" }}>
      {/* WebGL canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />

      {/* Centered content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        maxWidth: 640, padding: "0 48px", textAlign: "center",
      }}>

        {/* Badge */}
        <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32, padding: "6px 18px", borderRadius: 999, border: "1px solid rgba(139,92,246,0.30)", background: "rgba(109,40,217,0.12)", fontSize: 13, color: "rgba(196,181,253,0.88)", backdropFilter: "blur(8px)" }}>
          <span style={{ fontSize: 14 }}>✦</span>
          {badge}
        </div>

        {/* Headline */}
        <h1 style={{ margin: 0, lineHeight: 1.05 }}>
          <span className="hero-line1" style={{ display: "block", fontSize: "clamp(44px, 5.5vw, 82px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
            {headline.line1}
          </span>
          <span className="hero-line2" style={{ display: "block", fontSize: "clamp(36px, 4.8vw, 72px)", fontWeight: 900, letterSpacing: "-0.03em", background: "linear-gradient(100deg, #a78bfa 0%, #818cf8 45%, #60a5fa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {headline.line2}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle" style={{ margin: "20px 0 0", fontSize: "clamp(14px, 1.4vw, 17px)", lineHeight: 1.65, color: "rgba(196,181,253,0.60)", maxWidth: 440 }}>
          {subtitle}
        </p>

        {/* Buttons */}
        <div className="hero-buttons" style={{ marginTop: 36, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <GradientButton size="lg" onClick={() => router.push(primaryHref)}>
            {primaryLabel}
          </GradientButton>
          <GradientButton size="lg" variant="outline" onClick={() => router.push(secondaryHref)}>
            {secondaryLabel}
          </GradientButton>
        </div>

        {/* Footer note */}
        <p className="hero-footer" style={{ marginTop: 20, fontSize: 12, color: "rgba(196,181,253,0.30)" }}>
          By continuing, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
