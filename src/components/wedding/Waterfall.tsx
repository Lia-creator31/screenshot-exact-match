import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import waterBase from "@/assets/water_base.webp";
import waterMask from "@/assets/water_mask.png";
import fallAlpha from "@/assets/water_fall_alpha.png";

/* Living waterfall + pool painted over the castle artwork.
   The overlay covers a fixed window of the 1080x1920 castle image
   (x 220–860, y 1090–1490). `water_base` is that exact crop and
   `water_mask` holds, per channel: R = falling water, G = pool,
   B = foam at the impact point, A = mist. Only the water's texture moves —
   rocks, plants and the castle stay perfectly still. */
const REGION = { left: (220 / 1080) * 100, top: (1090 / 1920) * 100, width: (640 / 1080) * 100, height: (400 / 1920) * 100 };

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2((aPos.x + 1.0) * 0.5, (1.0 - aPos.y) * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uImg;
uniform sampler2D uMask;
uniform float uT;
varying vec2 vUv;
const vec2 S = vec2(640.0, 400.0);
const vec2 IMPACT = vec2(385.0, 236.0);

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vUv * S;
  vec4 m = texture2D(uMask, vUv);
  vec3 base = texture2D(uImg, vUv).rgb;
  float t = uT;

  /* ---- Falling water: streaks travel down, each column at its own pace,
     speeding up as the water drops away from the lip. ---- */
  float drop = clamp((p.y - 26.0) / 210.0, 0.0, 1.0);
  float lane = n(vec2(p.x * 0.07, 3.1));
  float spd = 55.0 + 55.0 * lane;
  float travel = p.y * (1.0 - 0.35 * drop) - t * spd;
  float s1 = fbm(vec2(p.x * 0.12 + lane * 4.0, travel * 0.016));
  float s2 = n(vec2(p.x * 0.38, (p.y - t * spd * 1.4) * 0.045));
  float streak = s1 * 0.7 + s2 * 0.3;
  vec3 fallC = base * mix(0.84, 1.07, smoothstep(0.25, 0.7, streak));
  fallC = mix(fallC, vec3(0.99, 0.99, 1.0), smoothstep(0.6, 0.82, streak) * 0.6);
  // glassy highlight rolling over the lip
  float lip = smoothstep(18.0, 30.0, p.y) * smoothstep(58.0, 34.0, p.y);
  fallC += vec3(1.0, 0.97, 0.92) * lip * smoothstep(0.55, 0.8, n(vec2(p.x * 0.09 - t * 0.35, 1.7))) * 0.3;
  fallC = mix(fallC, vec3(0.66, 0.82, 0.86), 0.09); // faint blue-green depth

  /* ---- Pool: gentle wobble of the painted reflections, rings spreading
     from the impact point (squashed for perspective) and drifting glints. ---- */
  vec2 rp = (p - IMPACT) * vec2(1.0, 2.6);
  float dist = length(rp);
  float ring = sin(dist * 0.085 - t * 2.1);
  float att = exp(-dist / 240.0) * smoothstep(12.0, 48.0, dist);
  vec2 d = vec2((n(vec2(p.x * 0.03, p.y * 0.12 + t * 0.55)) - 0.5) * 3.2,
                (n(vec2(p.x * 0.05 + t * 0.4, p.y * 0.2)) - 0.5) * 1.5);
  d += (rp / (dist + 0.001)) * vec2(1.0, 0.4) * ring * att * 2.4;
  vec3 poolC = texture2D(uImg, vUv + d / S).rgb;
  float gl = n(vec2(p.x * 0.06 + t * 0.22, p.y * 0.24 - t * 0.08)) * n(vec2(p.x * 0.11 - t * 0.27, p.y * 0.36 + 2.0));
  poolC += vec3(1.0, 0.98, 0.95) * smoothstep(0.4, 0.62, gl) * 0.32;
  poolC += vec3(0.07) * ring * att;
  poolC *= vec3(0.96, 1.0, 1.02);

  /* ---- Foam & spray where the water hits the pool ---- */
  vec2 fp = p - IMPACT;
  float boil = fbm(vec2(fp.x * 0.05 + sin(t * 0.6) * 0.3, fp.y * 0.1 + t * 0.9)) * 0.6
             + fbm(vec2(fp.x * 0.11, fp.y * 0.13 + t * 1.7)) * 0.5;
  float foam = m.b * smoothstep(0.38, 0.72, boil);
  float spray = 0.0;
  for (int i = 0; i < 2; i++) {
    float cs = 5.0 + float(i) * 3.0;
    vec2 g = (p + vec2(0.0, t * (14.0 + float(i) * 9.0))) / cs;
    vec2 id = floor(g);
    float r = h(id + float(i) * 7.3);
    float life = fract(t * (0.7 + r) + r * 9.0);
    vec2 c = vec2(h(id + 3.1), h(id + 5.7)) * 0.6 + 0.2;
    float dot1 = smoothstep(0.16, 0.0, length(fract(g) - c));
    spray += dot1 * step(0.72, r) * sin(life * 3.14159);
  }
  spray *= smoothstep(0.15, 0.6, m.a) * 0.7;

  /* ---- Thin mist drifting up from the base ---- */
  float mist = fbm(vec2(p.x * 0.016 + t * 0.04, p.y * 0.028 + t * 0.1));
  mist = smoothstep(0.38, 0.85, mist) * m.a * 0.42;

  vec3 col = base;
  float a = 0.0;
  col = mix(col, poolC, m.g); a = max(a, m.g);
  col = mix(col, fallC, m.r); a = max(a, m.r);
  float white = clamp(foam * 0.85 + spray, 0.0, 1.0);
  col = mix(col, vec3(1.0, 0.995, 1.0), white); a = max(a, white);
  col = mix(col, vec3(0.99, 0.97, 1.0), mist); a = max(a, mist);
  gl_FragColor = vec4(col * a, a);
}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function Waterfall() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) {
      setFallback(true);
      return;
    }

    let raf = 0;
    let visible = true;
    let disposed = false;
    const pace = reduce ? 0.3 : 1;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, "uT");

    const texture = (img: HTMLImageElement, unit: number, name: string) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(prog, name), unit);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr * 1.1));
      const hgt = Math.max(1, Math.round(canvas.clientHeight * dpr * 1.1));
      if (canvas.width !== w || canvas.height !== hgt) {
        canvas.width = w;
        canvas.height = hgt;
        gl.viewport(0, 0, w, hgt);
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      gl.uniform1f(uT, ((now / 1000) * pace) % 3600);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    const play = () => {
      if (!raf && visible && !document.hidden && !disposed) raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      play();
    });
    const onVis = () => play();
    const onLost = (e: Event) => {
      e.preventDefault();
      setFallback(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", onVis);

    Promise.all([loadImage(waterBase), loadImage(waterMask)])
      .then(([img, mask]) => {
        if (disposed) return;
        texture(img, 0, "uImg");
        texture(mask, 1, "uMask");
        resize();
        ro.observe(canvas);
        io.observe(canvas);
        canvas.style.opacity = "1";
        play();
      })
      .catch(() => setFallback(true));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduce]);

  const box = { left: `${REGION.left}%`, top: `${REGION.top}%`, width: `${REGION.width}%`, height: `${REGION.height}%` };

  if (fallback) {
    /* Light CSS version: streaks sliding down inside the falling-water shape
       plus a softly breathing foam cloud at its foot. */
    return (
      <div className="pointer-events-none absolute" style={box} aria-hidden>
        <div
          className="animate-water-flow absolute inset-0 bg-water-streaks"
          style={{ maskImage: `url(${fallAlpha})`, WebkitMaskImage: `url(${fallAlpha})`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
        />
        <span className="animate-mist absolute rounded-full bg-water-foam" style={{ left: "44%", top: "50%", width: "34%", height: "22%" }} />
      </div>
    );
  }

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute opacity-0 transition-opacity duration-700" style={box} />;
}
