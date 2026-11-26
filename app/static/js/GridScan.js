import{n as e,r as t,t as n}from"./bundle.js";var r=t(e(),1),i=n(),a=4,o=2.4,s=2.2,c=1.25,l={solid:0,dashed:1,dotted:2},u=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,d=`#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uPixel;
uniform vec3 uEye;
uniform float uDepth;
uniform vec3 uCell;
uniform float uThick;
uniform float uDot;
uniform int uStyle;
uniform vec3 uLineColor;
uniform vec3 uScanColor;
uniform vec3 uCoreColor;
uniform float uFade;
uniform float uScanZ;
uniform float uScanDir;
uniform float uScanAlpha;
uniform float uScanWidth;
uniform float uTrail;
uniform float uReveal;
uniform float uPoints;
uniform float uReflect;
uniform float uHaze;
uniform float uShade;
uniform float uLight;
uniform vec4 uPing[4];
uniform float uPingAlpha[4];
uniform vec4 uHover;
uniform float uTime;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outGlow;

struct Light {
  float grid;
  float fade;
  float core;
  float trail;
  float spill;
  float ping;
  float wake;
  float reveal;
};

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float lines(float across, float along, float period, float dash, float fa, float fb) {
  float u = across / period;
  float du = fa / period;
  float d = abs(fract(u + 0.5) - 0.5) / max(du, 1e-5);
  float dense = smoothstep(0.1, 0.4, du);
  if (uStyle == 2) {
    float c = along / dash * 5.0;
    float dc = fb / dash * 5.0;
    float e = abs(fract(c + 0.5) - 0.5) / max(dc, 1e-5);
    float cov = clamp(uThick + 1.0 - length(vec2(d, e)), 0.0, 1.0);
    float mean = min(1.0, 3.1416 * (uThick + 0.5) * (uThick + 0.5) * du * dc);
    return mix(cov, mean, max(dense, smoothstep(0.1, 0.4, dc)));
  }
  float cov = clamp(uThick + 0.5 - d, 0.0, 1.0);
  float mean = min(1.0, 2.0 * uThick * du);
  if (uStyle == 1) {
    float c = along / dash * 4.0;
    float dc = fb / dash * 4.0;
    float e = abs(fract(c + 0.5) - 0.5);
    float m = clamp((0.25 - e) / max(dc, 1e-5) + 0.5, 0.0, 1.0);
    cov *= mix(m, 0.5, smoothstep(0.1, 0.4, dc));
    mean *= 0.5;
  }
  return mix(cov, mean, dense);
}

float depthFade(float z) {
  float n = clamp(z / uDepth, 0.0, 1.0);
  return mix(1.0, (exp(-3.0 * n) - 0.0497871) / 0.9502129, uFade);
}

vec3 project(vec3 eye, vec3 o, int face, float plane) {
  vec3 d = o - eye;
  float t = face == 0 ? (plane - o.x) / d.x : (face == 1 ? (plane - o.y) / d.y : (plane - o.z) / d.z);
  return o + d * t;
}

void trace(vec3 o, vec3 d, out int face, out float plane, out vec3 h) {
  float sx = d.x > 0.0 ? 0.5 * uAspect : -0.5 * uAspect;
  float sy = d.y > 0.0 ? 0.5 : -0.5;
  float tx = abs(d.x) > 1e-6 ? (sx - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? (sy - o.y) / d.y : 1e9;
  float t = (uDepth - o.z) / d.z;
  face = 2;
  plane = uDepth;
  if (tx < t) {
    face = 0;
    plane = sx;
    t = tx;
  }
  if (ty < t) {
    face = 1;
    plane = sy;
    t = ty;
  }
  h = o + d * t;
}

vec2 faceUv(vec3 h, int face) {
  if (face == 0) return vec2(h.z, h.y + 0.5);
  if (face == 1) return vec2(h.x + 0.5 * uAspect, h.z);
  return vec2(h.x + 0.5 * uAspect, h.y + 0.5);
}

Light illuminate(vec3 h, int face, vec2 uv, vec2 foot, float blur) {
  Light l;
  vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
  vec2 f = foot * blur;
  float minor = max(lines(uv.x, uv.y, cell.x, cell.y, f.x, f.y), lines(uv.y, uv.x, cell.y, cell.x, f.y, f.x));
  float major = max(
    lines(uv.x, uv.y, cell.x * 4.0, cell.y, f.x, f.y),
    lines(uv.y, uv.x, cell.y * 4.0, cell.x, f.y, f.x)
  );
  l.grid = max(minor * 0.75, major) / blur;
  float z = h.z;
  l.fade = depthFade(z);
  l.reveal = smoothstep(uReveal, uReveal - 0.2, z);
  float zFoot = face == 0 ? f.x : (face == 1 ? f.y : 0.0);
  float width = max(uScanWidth, zFoot * 1.1);
  float dz = z - uScanZ;
  l.core = exp(-dz * dz / (width * width)) * (face == 2 ? 0.45 : 1.0) * uScanAlpha;
  float behind = -dz * uScanDir;
  l.trail = exp(-max(behind, 0.0) / uTrail) * smoothstep(-width, width * 0.5, behind) * uScanAlpha;
  l.spill = exp(-dz * dz / 0.05) * uScanAlpha;
  l.ping = 0.0;
  l.wake = 0.0;
  for (int i = 0; i < 4; i++) {
    float alpha = uPingAlpha[i];
    if (alpha <= 0.0) continue;
    float dist = length(h - uPing[i].xyz) - uPing[i].w;
    l.ping += exp(-dist * dist / 0.0012) * alpha;
    l.wake += exp(min(dist, 0.0) / 0.22) * smoothstep(0.03, -0.03, dist) * alpha;
  }
  return l;
}

void over(inout vec4 acc, vec3 color, float alpha) {
  alpha = clamp(alpha, 0.0, 1.0);
  acc = vec4(color * alpha, alpha) + acc * (1.0 - alpha);
}

void paint(inout vec4 color, inout float energy, Light l, float gain, float lift, float hover) {
  float base = l.grid * l.fade * l.reveal * lift;
  float far = l.fade * l.reveal * gain;
  float lit = l.grid * (l.core * 1.2 + l.trail * 0.75 + l.ping * 1.4 + l.wake * 0.5 + hover * 0.5) * far;
  float sheen = (l.core * 0.14 + l.spill * 0.05 + l.trail * 0.03 + l.ping * 0.2 + l.wake * 0.04) * far;
  float laser = (l.core + l.ping * 0.35) * far;
  over(color, uLineColor, base);
  over(color, uScanColor, sheen);
  over(color, uScanColor, lit);
  over(color, uCoreColor, laser * 0.9);
  energy += laser * 0.9 + lit * 0.5;
}

void main() {
  vec3 p = vec3((vUv.x - 0.5) * uAspect, vUv.y - 0.5, 0.0);
  vec3 d = p - uEye;
  int face;
  float plane;
  vec3 h;
  trace(p, d, face, plane, h);
  vec3 hx = project(uEye, p + vec3(uPixel, 0.0, 0.0), face, plane);
  vec3 hy = project(uEye, p + vec3(0.0, uPixel, 0.0), face, plane);
  vec2 uv = faceUv(h, face);
  vec2 ux = faceUv(hx, face) - uv;
  vec2 uy = faceUv(hy, face) - uv;
  vec2 foot = vec2(length(vec2(ux.x, uy.x)), length(vec2(ux.y, uy.y)));
  Light l = illuminate(h, face, uv, foot, 1.0);

  vec4 color = vec4(0.0);
  float energy = 0.0;

  if (uShade > 0.0) {
    vec2 gaps = face == 0
      ? vec2(0.5 - abs(h.y), uDepth - h.z)
      : (face == 1 ? vec2(0.5 * uAspect - abs(h.x), uDepth - h.z) : vec2(0.5 * uAspect - abs(h.x), 0.5 - abs(h.y)));
    vec2 crease = 1.0 - exp(-max(gaps, 0.0) / 0.16);
    float occlusion = crease.x * crease.y;
    float lamp = 1.0 / (1.0 + h.z * h.z * 0.9);
    float tilt = face == 1 ? (plane < 0.0 ? 1.1 : 0.85) : (face == 2 ? 0.8 : 1.0);
    float glowSpill = (l.spill * 0.5 + l.trail * 0.12) * l.reveal * l.fade;
    if (uLight > 0.5) {
      float shadow = (1.0 - lamp * tilt) * 0.09 + (1.0 - occlusion) * 0.2;
      over(color, vec3(0.0), shadow * uShade * l.reveal * l.fade);
    } else {
      over(color, vec3(1.0), lamp * tilt * occlusion * 0.11 * uShade * l.reveal * l.fade);
    }
    over(color, uScanColor, glowSpill * uShade * occlusion * 0.35);
  }

  if (face == 1 && plane < 0.0 && uReflect > 0.0) {
    vec3 mirror = vec3(uEye.x, -1.0 - uEye.y, uEye.z);
    vec3 r = h - mirror;
    int face2;
    float plane2;
    vec3 h2;
    trace(h, r, face2, plane2, h2);
    vec2 uv2 = faceUv(h2, face2);
    vec2 ux2 = faceUv(project(mirror, hx, face2, plane2), face2) - uv2;
    vec2 uy2 = faceUv(project(mirror, hy, face2, plane2), face2) - uv2;
    vec2 foot2 = vec2(length(vec2(ux2.x, uy2.x)), length(vec2(ux2.y, uy2.y)));
    float travel = length(h2 - h);
    Light m = illuminate(h2, face2, uv2, foot2, 1.0 + travel * 4.0);
    m.reveal *= l.reveal;
    float grazing = 1.0 - normalize(r).y;
    float gain = (0.3 + 0.7 * grazing * grazing * grazing * grazing) * uReflect * exp(-travel * 1.1) * (uLight > 0.5 ? 0.6 : 1.0);
    float reflected = 0.0;
    paint(color, reflected, m, gain, 0.0, 0.0);
    energy += reflected * 0.6;
  }

  vec3 near = h - uHover.xyz;
  float hover = exp(-dot(near, near) / 0.08) * uHover.w;
  paint(color, energy, l, 1.0, 1.0, hover);

  if (uPoints > 0.5) {
    vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
    vec2 spacing = cell / 2.5;
    vec2 q = uv / spacing;
    vec2 id = floor(q);
    vec2 seed = id + vec2(float(face) * 13.7 + plane * 5.3, float(face) * 3.1);
    vec2 delta = (q - id - (0.2 + 0.6 * hash2(seed))) * spacing;
    float det = ux.x * uy.y - ux.y * uy.x;
    vec2 s = vec2(delta.x * uy.y - delta.y * uy.x, ux.x * delta.y - ux.y * delta.x) / det;
    float radius = uDot * mix(1.0, 0.55, clamp(h.z / uDepth, 0.0, 1.0));
    float spot = clamp(radius + 0.5 - length(s), 0.0, 1.0);
    float gap = min(spacing.x / foot.x, spacing.y / foot.y);
    float r = hash(seed + 7.7);
    float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + r * 5.0) + r * 40.0);
    float dots = spot * smoothstep(5.0, 10.0, gap) * smoothstep(0.25, 0.6, r) * (0.3 + 0.7 * r * r) * flicker;
    float hot = l.core * 2.5 + l.ping * 1.6;
    float warm = l.trail * l.trail * 1.3 + l.wake * 0.6 + hover * 1.3;
    float spark = dots * (hot + warm) * l.fade * l.reveal;
    over(color, mix(uScanColor, uCoreColor, clamp(hot / max(hot + warm, 1e-4), 0.0, 1.0)), spark);
    energy += spark * 0.9;
  }

  if (uHaze > 0.0 && uScanAlpha > 0.0 && uScanZ > 0.0 && h.z > uScanZ) {
    vec3 c = p + d * (uScanZ / d.z);
    float grain = hash(floor(c.xy * 180.0) + floor(uTime * 24.0) * 7.0);
    float edge = min(0.5 * uAspect - abs(c.x), 0.5 - abs(c.y));
    float rim = exp(-edge / 0.06);
    float veil = uHaze * uScanAlpha * (0.45 + 0.9 * grain) * (0.55 + rim * 1.6);
    over(color, uScanColor, veil * depthFade(uScanZ) * l.reveal);
  }

  energy = clamp(energy, 0.0, 1.0);
  outColor = color;
  outGlow = vec4(uScanColor * energy, energy);
}`,f=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 o = uTexel;
  outColor = 0.25 * (
    texture(uSource, vUv + vec2(-o.x, -o.y)) +
    texture(uSource, vUv + vec2(o.x, -o.y)) +
    texture(uSource, vUv + vec2(-o.x, o.y)) +
    texture(uSource, vUv + vec2(o.x, o.y))
  );
}`,p=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.1964825501511404;
  sum += (texture(uSource, vUv + uStep * 1.411764705882353) + texture(uSource, vUv - uStep * 1.411764705882353)) * 0.2969069646728344;
  sum += (texture(uSource, vUv + uStep * 3.2941176470588234) + texture(uSource, vUv - uStep * 3.2941176470588234)) * 0.09447039785044732;
  sum += (texture(uSource, vUv + uStep * 5.176470588235294) + texture(uSource, vUv - uStep * 5.176470588235294)) * 0.010381362401148057;
  outColor = sum;
}`,m=`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uGlow;
in vec2 vUv;
out vec4 outColor;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
void main() {
  vec4 scene = texture(uScene, vUv);
  vec4 bloom = texture(uBloom, vUv) * uGlow;
  bloom.a = min(bloom.a, 1.0);
  bloom.rgb = min(bloom.rgb, vec3(bloom.a));
  vec4 color = scene + bloom * (1.0 - scene.a);
  float noise = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color.a = clamp(color.a + noise, 0.0, 1.0);
  color.rgb = clamp(color.rgb + noise, vec3(0.0), vec3(color.a));
  outColor = color;
}`,h=(e,t,n)=>Math.min(n,Math.max(t,e)),g=(e,t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null},_=(e,t)=>{let n=g(e,e.VERTEX_SHADER,u),r=g(e,e.FRAGMENT_SHADER,t),i=e.createProgram();if(!n||!r||!i)return null;if(e.attachShader(i,n),e.attachShader(i,r),e.linkProgram(i),e.deleteShader(n),e.deleteShader(r),!e.getProgramParameter(i,e.LINK_STATUS))return e.deleteProgram(i),null;let a={},o=e.getProgramParameter(i,e.ACTIVE_UNIFORMS);for(let t=0;t<o;t++){let n=e.getActiveUniform(i,t);if(!n)continue;let r=n.name.replace(/\[0\]$/,``);a[r]=e.getUniformLocation(i,r)}return{program:i,uniforms:a}},v=e=>{let t=e.createTexture();return e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),{texture:t,width:0,height:0}},y=(e,t,n,r)=>{t.width===n&&t.height===r||(t.width=n,t.height=r,e.bindTexture(e.TEXTURE_2D,t.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,n,r,0,e.RGBA,e.UNSIGNED_BYTE,null))},b=({linesColor:e,scanColor:t,cells:n=8,lineThickness:u=1,lineStyle:g=`solid`,depth:b=3,depthFade:x=.6,parallax:S=1,points:C=!0,reflection:w=.35,shading:T=.7,scanDirection:E=`forward`,scanDuration:D=2.4,scanDelay:O=1.6,scanWidth:k=1,trail:A=.5,glow:j=.6,autoScan:M=!0,interactive:N=!0,clickEffect:P=`ping`,intro:F=!0,lightMode:I=!1,dpr:L,className:R=``,style:z,...B})=>{let V=(0,r.useRef)(null),H=(0,r.useRef)(null),U=(0,r.useRef)(null),[W,G]=(0,r.useState)(!1),K={linesColor:e??(I?`#32323D`:`#1F1F26`),scanColor:t??`#00FF66`,cells:h(n,2,40),thickness:h(u,.5,4),style:l[g]??0,depth:h(b,.5,12),depthFade:h(x,0,1),parallax:h(S,0,3),points:C,reflection:h(w,0,1),shading:h(T,0,1),direction:E,duration:h(D,.3,20),delay:h(O,0,30),scanWidth:h(k,.2,5),trail:h(A,0,1),glow:h(j,0,1.5),autoScan:M,interactive:N,clickEffect:P,intro:F,lightMode:I,dpr:L},q=(0,r.useRef)(K);return q.current=K,(0,r.useEffect)(()=>{let e=V.current,t=H.current,n=t?.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!e||!t||!n){G(!0);return}let r=_(n,d),i=_(n,f),l=_(n,p),u=_(n,m);if(!r||!i||!l||!u){G(!0);return}let g=n.createVertexArray(),b=v(n),x=v(n),S=v(n),C=v(n),w=n.createFramebuffer(),T=n.createFramebuffer(),E=n.createFramebuffer(),D=document.createElement(`canvas`).getContext(`2d`,{willReadFrequently:!0}),O=new Map,k=e=>{let t=String(e),n=O.get(t);if(n)return n;let r=[1,1,1];if(D){D.clearRect(0,0,1,1),D.fillStyle=`#000000`,D.fillStyle=t,D.fillRect(0,0,1,1);let[e,n,i]=D.getImageData(0,0,1,1).data;r=[e/255,n/255,i/255]}return O.set(t,r),r},A=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,j={width:1,height:1,ratio:1},M={x:0,y:0,vx:0,vy:0,tx:0,ty:0,f:c,vf:0,tf:c},N={x:0,y:0,inside:!1},P={x:0,y:0,held:!1},F={x:0,y:0,z:0,strength:0,ready:!1},I={z:0,dir:1,alpha:0,start:0,sweeps:0,waiting:!1},L=[],R=new Float32Array(a*4),z=new Float32Array(a),B=0,W=q.current.intro&&!A?0:1,K=0,J=0,Y=!0,X=0,Z=()=>{let e=q.current,t=j.width/j.height,n=1/Math.round(e.cells);return{aspect:t,cx:t/Math.max(1,Math.round(t/n)),cy:n,roomDepth:Math.max(n,Math.round(e.depth/n)*n)}},Q=(e,t)=>{let{aspect:n,roomDepth:r}=Z(),i=(e-.5)*n,a=t-.5,o=i-M.x,s=a-M.y,c=M.f,l=o>0?.5*n:-.5*n,u=s>0?.5:-.5,d=r/c;return Math.abs(o)>1e-6&&(d=Math.min(d,(l-i)/o)),Math.abs(s)>1e-6&&(d=Math.min(d,(u-a)/s)),{x:i+o*d,y:a+s*d,z:c*d}},ee=e=>{I.dir=e.direction===`backward`||e.direction===`pingpong`&&I.sweeps%2==1?-1:1,I.start=B,I.waiting=!1,I.sweeps+=1},te=(e,t)=>{if(W<1){let e=W;I.dir=1,I.z=e*(t+.4)-.2,I.alpha=Math.min(1,e*6)*(1-Math.max(0,e-.85)/.15);return}if(I.sweeps===0&&!I.waiting&&(I.waiting=!0,I.start=B,I.alpha=0),I.waiting){I.alpha=0,e.autoScan&&!A&&B-I.start>=e.delay&&ee(e);return}let n=(B-I.start)/e.duration;if(n>=1){I.waiting=!0,I.start=B,I.alpha=0;return}let r=n*(t+.3)-.15;I.z=I.dir>0?r:t-r,I.alpha=Math.min(1,n/.12)*Math.min(1,(1-n)/.12)},ne=e=>{let t=Math.max(1,Math.ceil(e/(1/120))),n=e/t;for(let e=0;e<t;e++)M.vx+=((M.tx-M.x)*42-M.vx*11)*n,M.vy+=((M.ty-M.y)*42-M.vy*11)*n,M.vf+=((M.tf-M.f)*42-M.vf*11)*n,M.x+=M.vx*n,M.y+=M.vy*n,M.f+=M.vf*n},re=(e,t,n)=>{P.x=h(e,-1,1),P.y=h(t,-1,1),P.held=n},ie=e=>{let t=j.width/j.height,n=+!A,r=P.held?P.x:(Math.sin(B*.21)*.2+Math.sin(B*.083+1.3)*.12)*n,i=P.held?P.y:Math.sin(B*.17+2.1)*.16*n;M.tx=r*e.parallax*.22*t,M.ty=i*e.parallax*.22},ae=()=>{let e=q.current,{aspect:a,cx:o,cy:s,roomDepth:c}=Z(),d=k(e.linesColor),f=k(e.scanColor),p=e.lightMode?f:f.map(e=>e+(1-e)*.65),m=r.uniforms;n.bindVertexArray(g),n.disable(n.BLEND),n.bindFramebuffer(n.FRAMEBUFFER,w),n.drawBuffers([n.COLOR_ATTACHMENT0,n.COLOR_ATTACHMENT1]),n.viewport(0,0,t.width,t.height),n.useProgram(r.program),n.uniform1f(m.uAspect,a),n.uniform1f(m.uPixel,1/t.height),n.uniform3f(m.uEye,M.x,M.y,-M.f),n.uniform1f(m.uDepth,c),n.uniform3f(m.uCell,o,s,s),n.uniform1f(m.uThick,e.thickness*j.ratio*.5),n.uniform1f(m.uDot,1.8*j.ratio),n.uniform1i(m.uStyle,e.style),n.uniform3fv(m.uLineColor,d),n.uniform3fv(m.uScanColor,f),n.uniform3fv(m.uCoreColor,p),n.uniform1f(m.uFade,e.depthFade),n.uniform1f(m.uScanZ,I.z),n.uniform1f(m.uScanDir,I.dir),n.uniform1f(m.uScanAlpha,I.alpha),n.uniform1f(m.uScanWidth,.006*e.scanWidth),n.uniform1f(m.uTrail,.04+e.trail*1.1),n.uniform1f(m.uReveal,W<1?I.z+.05:1e4),n.uniform1f(m.uPoints,+!!e.points),n.uniform1f(m.uReflect,e.reflection),n.uniform1f(m.uHaze,e.lightMode?.03:.05),n.uniform1f(m.uShade,e.shading),n.uniform1f(m.uLight,+!!e.lightMode),n.uniform4fv(m.uPing,R),n.uniform1fv(m.uPingAlpha,z),n.uniform4f(m.uHover,F.x,F.y,F.z,F.strength),n.uniform1f(m.uTime,B),n.drawArrays(n.TRIANGLES,0,3);let h=e.glow>0;if(h){n.bindFramebuffer(n.FRAMEBUFFER,T),n.viewport(0,0,S.width,S.height),n.useProgram(i.program),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,x.texture),n.uniform1i(i.uniforms.uSource,0),n.uniform2f(i.uniforms.uTexel,1/x.width,1/x.height),n.drawArrays(n.TRIANGLES,0,3);let e=2.2*j.ratio/2;n.useProgram(l.program),n.uniform1i(l.uniforms.uSource,0),n.bindFramebuffer(n.FRAMEBUFFER,E),n.bindTexture(n.TEXTURE_2D,S.texture),n.uniform2f(l.uniforms.uStep,e/S.width,0),n.drawArrays(n.TRIANGLES,0,3),n.bindFramebuffer(n.FRAMEBUFFER,T),n.bindTexture(n.TEXTURE_2D,C.texture),n.uniform2f(l.uniforms.uStep,0,e/S.height),n.drawArrays(n.TRIANGLES,0,3)}n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,t.width,t.height),n.useProgram(u.program),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,b.texture),n.uniform1i(u.uniforms.uScene,0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,S.texture),n.uniform1i(u.uniforms.uBloom,1),n.uniform1f(u.uniforms.uGlow,h?e.glow*(e.lightMode?.8:1.6):0),n.drawArrays(n.TRIANGLES,0,3),n.activeTexture(n.TEXTURE0)},oe=()=>{let r=q.current;j.width=Math.max(1,e.clientWidth),j.height=Math.max(1,e.clientHeight),j.ratio=Math.min(r.dpr||window.devicePixelRatio||1,2),t.width=Math.max(1,Math.round(j.width*j.ratio)),t.height=Math.max(1,Math.round(j.height*j.ratio)),y(n,b,t.width,t.height),y(n,x,t.width,t.height),n.bindFramebuffer(n.FRAMEBUFFER,w),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,b.texture,0),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT1,n.TEXTURE_2D,x.texture,0);let i=Math.max(1,Math.round(t.width/4)),a=Math.max(1,Math.round(t.height/4));y(n,S,i,a),y(n,C,i,a),n.bindFramebuffer(n.FRAMEBUFFER,T),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,S.texture,0),n.bindFramebuffer(n.FRAMEBUFFER,E),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,C.texture,0),n.bindFramebuffer(n.FRAMEBUFFER,null),ae(),$()},se=e=>{if(K=0,!Y||document.hidden)return;let t=q.current,n=J?h((e-J)/1e3,.001,.05):1/60;J=e,B+=n,W<1&&(W=Math.min(1,W+n/s));let{roomDepth:r}=Z();te(t,r),ie(t),ne(n);let i=t.interactive&&N.inside&&!A?1:0;if(i){let e=Q(N.x,N.y);F.ready||Object.assign(F,e,{ready:!0});let t=1-Math.exp(-n/.08);F.x+=(e.x-F.x)*t,F.y+=(e.y-F.y)*t,F.z+=(e.z-F.z)*t}F.strength+=(i-F.strength)*(1-Math.exp(-n/.25)),!i&&F.strength<.01&&(F.ready=!1);for(let e=L.length-1;e>=0;e--)L[e].age+=n,L[e].age>o&&L.splice(e,1);for(let e=0;e<a;e++){let t=L[e];if(!t){z[e]=0;continue}let n=t.age/o;R.set([t.x,t.y,t.z,t.age*1.15],e*4),z[e]=Math.min(1,t.age/.05)*(1-n)*(1-n)}ae();let c=Math.abs(M.tx-M.x)+Math.abs(M.ty-M.y)+Math.abs(M.tf-M.f)>1e-4||Math.abs(M.vx)+Math.abs(M.vy)+Math.abs(M.vf)>1e-4;W<1||!A&&t.autoScan||!I.waiting||L.length>0||c||F.strength>.002||!A&&t.parallax>0&&!P.held||t.points&&!A&&I.alpha>0?K=requestAnimationFrame(se):J=0};function $(){!K&&Y&&!document.hidden&&(K=requestAnimationFrame(se))}let ce=t=>{let n=e.getBoundingClientRect(),r=(t.clientX-n.left)/Math.max(1,n.width),i=1-(t.clientY-n.top)/Math.max(1,n.height);return{u:r,v:i,inside:r>=0&&r<=1&&i>=0&&i<=1}},le=e=>{let t=q.current,{u:n,v:r,inside:i}=ce(e);N.x=n,N.y=r;let a=N.inside;N.inside=i,i?(window.clearTimeout(X),X=0,t.interactive&&!A&&re(n*2-1,r*2-1,!0),$()):a&&!X&&(X=window.setTimeout(()=>{X=0,P.held=!1,$()},220),$())},ue=e=>{let t=q.current,{u:n,v:r,inside:i}=ce(e);if(!(!i||A||t.clickEffect===`none`)){if(t.clickEffect===`scan`)W>=1&&ee(t);else{let e=Q(n,r);L.unshift({...e,age:0}),L.length>a&&L.pop()}$()}},de=()=>{N.inside=!1,P.held=!1,$()},fe=()=>{J=0,$()},pe=new ResizeObserver(oe);pe.observe(e);let me=new IntersectionObserver(e=>{Y=e.some(e=>e.isIntersecting),Y&&(J=0,$())});return me.observe(e),window.addEventListener(`pointermove`,le,{passive:!0}),window.addEventListener(`pointerdown`,ue,{passive:!0}),document.documentElement.addEventListener(`pointerleave`,de),document.addEventListener(`visibilitychange`,fe),oe(),U.current=$,()=>{cancelAnimationFrame(K),window.clearTimeout(X),U.current=null,pe.disconnect(),me.disconnect(),window.removeEventListener(`pointermove`,le),window.removeEventListener(`pointerdown`,ue),document.documentElement.removeEventListener(`pointerleave`,de),document.removeEventListener(`visibilitychange`,fe),[b,x,S,C].forEach(e=>n.deleteTexture(e.texture)),[w,T,E].forEach(e=>n.deleteFramebuffer(e)),n.deleteVertexArray(g),[r,i,l,u].forEach(e=>n.deleteProgram(e.program)),t.isConnected||n.getExtension(`WEBGL_lose_context`)?.loseContext()}},[]),(0,r.useEffect)(()=>{U.current?.()}),W?(0,i.jsx)(`div`,{ref:V,className:`grid-scan ${R}`,style:{backgroundImage:`linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,backgroundSize:`40px 40px`,...z},"aria-hidden":`true`,...B}):(0,i.jsx)(`div`,{ref:V,className:`grid-scan${R?` ${R}`:``}`,style:z,...B,children:(0,i.jsx)(`canvas`,{ref:H,className:`grid-scan-canvas`,"aria-hidden":`true`})})};export{b as GridScan,b as default};