'use client';

import React, { useRef, useEffect } from 'react';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface HeroProps {
  trustBadge?: { text: string; icons?: string[] };
  headline: { line1: string; line2: string };
  subtitle: string;
  buttons?: {
    primary?: { text: string; onClick?: () => void };
    secondary?: { text: string; onClick?: () => void };
  };
  className?: string;
}

/* ── WebGL shader source ──────────────────────────────────────────────────── */

const SHADER_SOURCE = `#version 300 es
/*
 * Original by Matthias Hurrle (@atzedent)
 * Colors adapted for SYNQ brand palette via CSS hue-rotate
 */
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(in vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}return t;}
float clouds(vec2 p){float d=1.,t=.0;for(float i=.0;i<3.;i++){float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);t=mix(t,d,a);d=a;p*=2./(i+1.);}return t;}
void main(void){
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for(float i=1.;i<12.;i++){
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`;

/* ── Shader hook ──────────────────────────────────────────────────────────── */

function useShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    // --- helpers ---
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

    const vs  = compile(gl.VERTEX_SHADER,   VERT);
    const fs  = compile(gl.FRAGMENT_SHADER, SHADER_SOURCE);
    const prg = gl.createProgram()!;
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prg, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prg, 'resolution');
    const uTime = gl.getUniformLocation(prg, 'time');
    const uMove = gl.getUniformLocation(prg, 'move');
    const uTouch = gl.getUniformLocation(prg, 'touch');

    // --- pointer tracking ---
    let mouseX = 0, mouseY = 0;
    const onMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = canvas.height - e.clientY; };
    canvas.addEventListener('mousemove', onMove);

    // --- resize ---
    const resize = () => {
      const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // --- render loop ---
    const loop = (now: number) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prg);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.uniform2f(uRes,   canvas.width, canvas.height);
      gl.uniform1f(uTime,  now * 1e-3);
      gl.uniform2f(uMove,  0, 0);
      gl.uniform2f(uTouch, mouseX, mouseY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(prg);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return canvasRef;
}

/* ── ShaderBackground — drop-in canvas layer ──────────────────────────────── */
// Place inside a `relative overflow-hidden` container.
// CSS filter hue-rotates the original amber/orange palette into SYNQ violet/cyan.

export function ShaderBackground({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useShaderBackground();
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full touch-none ${className}`}
      style={style}
    />
  );
}

/* ── Full Hero component ──────────────────────────────────────────────────── */

const Hero: React.FC<HeroProps> = ({ trustBadge, headline, subtitle, buttons, className = '' }) => {
  const canvasRef = useShaderBackground();

  return (
    <div className={`relative h-screen w-full overflow-hidden bg-black ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full touch-none"
        style={{ filter: 'hue-rotate(220deg) saturate(1.4)' }}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
        {trustBadge && (
          <div className="mb-8 animate-hero-fade-down">
            <div className="flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-500/10 px-6 py-3 text-sm backdrop-blur-md">
              {trustBadge.icons && (
                <div className="flex">
                  {trustBadge.icons.map((icon, i) => (
                    <span key={i}>{icon}</span>
                  ))}
                </div>
              )}
              <span className="text-orange-100">{trustBadge.text}</span>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl space-y-6 px-4 text-center">
          <div className="space-y-2">
            <h1 className="animate-hero-fade-up animation-delay-200 bg-gradient-to-r from-orange-300 via-yellow-400 to-amber-300 bg-clip-text text-5xl font-bold text-transparent md:text-7xl lg:text-8xl">
              {headline.line1}
            </h1>
            <h1 className="animate-hero-fade-up animation-delay-400 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-5xl font-bold text-transparent md:text-7xl lg:text-8xl">
              {headline.line2}
            </h1>
          </div>

          <div className="animate-hero-fade-up animation-delay-600 mx-auto max-w-3xl">
            <p className="text-lg font-light leading-relaxed text-orange-100/90 md:text-xl lg:text-2xl">
              {subtitle}
            </p>
          </div>

          {buttons && (
            <div className="animate-hero-fade-up animation-delay-800 mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              {buttons.primary && (
                <button
                  onClick={buttons.primary.onClick}
                  className="rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 px-8 py-4 text-lg font-semibold text-black transition-all duration-300 hover:scale-105 hover:from-orange-600 hover:to-yellow-600 hover:shadow-xl hover:shadow-orange-500/25"
                >
                  {buttons.primary.text}
                </button>
              )}
              {buttons.secondary && (
                <button
                  onClick={buttons.secondary.onClick}
                  className="rounded-full border border-orange-300/30 bg-orange-500/10 px-8 py-4 text-lg font-semibold text-orange-100 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-orange-300/50 hover:bg-orange-500/20"
                >
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
