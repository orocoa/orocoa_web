export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const range=(p,a,b)=>clamp((p-a)/(b-a));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const mix=(a,b,p)=>a+(b-a)*p;
export const phase=(p,a,b)=>smooth(range(p,a,b));
export const stops=[0,.24,.43,.60,.79,1];
// Absolute poses make every stop, reverse and fast scroll deterministic.
// A single half-turn reveals the iPad front after the edge-on replacement.
export function sample(p){
  p=clamp(p);
  return {p,pull:phase(p,.02,.24),close:phase(p,.29,.43),lift:phase(p,.46,.60),spin:phase(p,.61,.80),zoom:phase(p,.845,1),
    lidAngle:mix(0,Math.PI/2,phase(p,.29,.43)),spinAngle:Math.PI*phase(p,.61,.80),
    stage:p<.25?0:p<.45?1:p<.61?2:p<.81?3:p<.845?4:5};
}
