/* Procedural display particles. Distances in meters, time in seconds. */
const FIREWORK_TYPES = ['Peony', 'Chrysanthemum', 'Willow', 'Palm', 'Ring', 'Crackle'];
function fireworkRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function sparkPosition(p, age) {
  const k = p.drag, q = (1 - Math.exp(-k * age)) / k;
  return [p.origin[0] + p.velocity[0] * q + age * .7,
    p.origin[1] + p.velocity[1] * q - 5.2 * (age - q) / k,
    p.origin[2] + p.velocity[2] * q];
}
function fireworkSize(heldSeconds=0) {
  return .6 + 1.25 * Math.min(1, Math.max(0, (heldSeconds-.12)/1.8));
}
const SHOW_PRESETS = {
  gold: {name:'Golden tide', duration:60, types:['Willow','Ring','Palm','Chrysanthemum','Peony','Crackle']},
  festival: {name:'Summer festival', duration:90, types:['Peony','Ring','Crackle','Palm','Chrysanthemum','Willow']},
  quiet: {name:'Quiet embers', duration:45, types:['Willow','Ring','Peony','Palm','Chrysanthemum','Crackle']}
};
function createShowPlan(preset='gold') {
  const config=SHOW_PRESETS[preset]||SHOW_PRESETS.gold, random=fireworkRandom(791), events=[];
  const add=(at,type,x,size,height=110)=>events.push({at,type,x,size,height,seed:Math.floor(random()*1e8)});
  // Opening solos, alternating forms, a breathing space, then a layered finale.
  const opening=config.duration-16;
  for(let at=0,i=0;at<opening-4;at+=4.8,i++) {
    add(at,config.types[i%6],Math.sin(i*2.3)*.65,preset==='quiet'?.7:.85+(i%3)*.18,90+(i%3)*20);
    if(i>3 && i%3===1) add(at+.8,config.types[(i+2)%6],-.6*Math.sin(i*2.3),.7,95);
  }
  for(let i=0;i<3;i++) {
    const at=opening+i*4;
    add(at,'Ring',-.75,1.05,115);add(at+.2,'Chrysanthemum',.75,1.1,120);
    add(at+1.1,i===2?'Crackle':'Palm',0,1.25,140);
  }
  add(config.duration-3,'Peony',-.6,1.25,110);add(config.duration-2.8,'Peony',.6,1.25,110);
  add(config.duration-1.5,'Willow',-.4,1.65,145);add(config.duration-1.3,'Willow',.4,1.65,145);
  add(config.duration,'Willow',0,1.85,170);
  events.sort((a,b)=>a.at-b.at);
  return {name:config.name,duration:config.duration+14,finaleAt:opening,events};
}
class FireworkSequence {
  constructor(preset,start) { this.plan=createShowPlan(preset);this.start=start;this.cursor=0;this.done=false; }
  update(time,emit) {
    const elapsed=time-this.start;
    while(this.cursor<this.plan.events.length && this.plan.events[this.cursor].at<=elapsed) {
      const event=this.plan.events[this.cursor++];
      // Do not dump missed shells after a stalled/background frame.
      if(elapsed-event.at<.8) emit(event,this.start+event.at);
    }
    this.done=elapsed>=this.plan.duration;
  }
}
class FireworkWorld {
  constructor() { this.shells = []; this.serial = 0; this.limit = 16; }
  launch(type, target, time, seed = ++this.serial * 739, size = 1) {
    if (this.shells.length >= this.limit) return null;
    size=Math.max(.6,Math.min(1.85,Number.isFinite(size)?size:1));
    const random = fireworkRandom(seed), kind = FIREWORK_TYPES.indexOf(type);
    const duration = 1.65 + target[1] / 180;
    const start = [target[0] * .94, 1, target[2]];
    const palette = [[1,.18,.09],[.12,.48,1],[.25,1,.52],[1,.15,.48],[.6,.25,1]];
    const color = kind === 2 || kind === 3 ? [1,.63,.19] : palette[Math.floor(random()*palette.length)];
    const shell = { type, start, target, time, burst:time+duration, duration, sparks:[], color, seed, size };
    const count = Math.round([200,260,210,100,160,140][Math.max(0,kind)]*Math.sqrt(size));
    const ringTilt = random()*.7;
    for(let i=0;i<count;i++) {
      let y=random()*2-1, a=random()*Math.PI*2, r=Math.sqrt(1-y*y);
      let dir=[r*Math.cos(a),y,r*Math.sin(a)];
      if(kind===4) { a=i/count*Math.PI*2; dir=[Math.cos(a),Math.sin(a)*Math.cos(ringTilt),Math.sin(a)*Math.sin(ringTilt)]; }
      if(kind===3) { a=(i%7)/7*Math.PI*2; dir=[Math.cos(a)*.8+(random()-.5)*.09, .4+random()*.5,Math.sin(a)*.8]; }
      const speed=(kind===2?23:kind===3?29:25)*(0.8+random()*.35)*size;
      const life=(kind===2?6:kind===1?4.6:3.1)*(0.8+random()*.4)*Math.sqrt(size);
      const c=color.map((v,j)=>v*(.75+random()*.25)+(kind===2 && j===0?.2:0));
      shell.sparks.push({origin:target,velocity:dir.map(v=>v*speed),drag:kind===2?.18:.42,life,color:c,delay:0,twinkle:random()*9,trail:kind===0?4:kind===4?5:12});
    }
    if(kind===5) {
      for(let i=0;i<24;i++) {
        const parent=shell.sparks[i*4], delay=.65+random()*.9, origin=sparkPosition(parent,delay);
        for(let j=0;j<7;j++) { const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);
          shell.sparks.push({origin,velocity:[r*Math.cos(a)*9,y*9,r*Math.sin(a)*9],drag:.7,life:.6+random()*.5,color:[1,.8,.4],delay,twinkle:random()*9,trail:3}); }
      }
    }
    shell.end=shell.burst+Math.max(...shell.sparks.map(p=>p.delay+p.life));
    this.shells.push(shell); return shell;
  }
  update(time) { this.shells=this.shells.filter(s=>time<s.end); }
}

class FireworkRenderer {
  constructor(gl, helpers) {
    this.gl=gl; this.h=helpers; this.world=new FireworkWorld();
    this.atlas=helpers.rt(helpers.mobile?1024:1536,helpers.mobile?512:768,gl.RGBA16F);
    this.data=new Float32Array(60000*8); this.count=0;
    this.vao=gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);
    for(const [loc,n,off] of [[0,3,0],[1,3,3],[2,2,6]]) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,n,gl.FLOAT,false,32,off*4); }
    this.program=helpers.prog(`#version 300 es
      precision highp float;
      layout(location=0) in vec3 position; layout(location=1) in vec3 color; layout(location=2) in vec2 sizePower;
      uniform vec3 uCam,uR,uU,uF; uniform float uAspect,uTanF,uHeight; uniform int uAtlas;
      out vec3 vColor; out float vVisible;
      void main(){
        vec3 d=position-uCam; float distanceTo=max(length(d),1.); vec3 dir=d/distanceTo;
        float z=dot(d,uF); vVisible=step(.016,dir.y)*step(0.,position.y);
        if(uAtlas==1){
          float a=atan(dir.x,-dir.z), e=asin(clamp(dir.y,-1.,1.));
          gl_Position=vec4(a/3.14159265,e/1.57079633,0,1);
          gl_PointSize=clamp(sizePower.x/distanceTo*uHeight/3.14159265,1.5,18.);
        } else {
          gl_Position=vec4(dot(d,uR)/(uAspect*uTanF),dot(d,uU)/uTanF,0,z);
          gl_PointSize=clamp(sizePower.x/distanceTo*uHeight/(2.*uTanF),1.4,24.);
          vVisible*=step(.1,z);
        }
        vColor=color*sizePower.y;
      }`, `#version 300 es
      precision highp float; in vec3 vColor; in float vVisible; out vec4 o;
      void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1. || vVisible<.5) discard;
        float a=exp(-r*4.5)*(1.-smoothstep(.65,1.,r)); o=vec4(vColor*a,0); }`, 'firework particles');
  }
  add(p,c,size,power) { if(this.count>=60000 || p[1]<0) return; const i=this.count++*8; const d=this.data; d[i]=p[0];d[i+1]=p[1];d[i+2]=p[2];d[i+3]=c[0];d[i+4]=c[1];d[i+5]=c[2];d[i+6]=size;d[i+7]=power*(this.gentle?.45:1); }
  update(time, droneShow) {
    this.world.update(time); this.count=0;
    for(const s of this.world.shells) {
      const age=time-s.time; if(age<0) continue;
      if(time<s.burst) {
        for(let j=0;j<32;j++) { const t=age-j*.017; if(t<0) break; const q=t/s.duration;
          const p=s.start.map((v,k)=>v+(s.target[k]-v)*q); p[1]+=18*Math.sin(q*Math.PI);
          this.add(p,[1,.58,.18],j===0?2.4:1.3,(1-j/32)*(j===0?28:7)*Math.sqrt(s.size)); }
      } else {
        const ba=time-s.burst;
        if(ba<.15 && !this.gentle) this.add(s.target,[1,.88,.65],14*s.size*(1-ba/.15),50*(1-ba/.15));
        for(const p of s.sparks) {
          const a=ba-p.delay; if(a<0||a>p.life) continue;
          const fade=Math.pow(1-a/p.life,.8), pulse=s.type==='Crackle'&&!this.gentle?.6+.4*Math.sin(a*48+p.twinkle):1;
          const trailCount=this.world.shells.length>8?Math.max(3,Math.round(p.trail*.65)):p.trail;
          for(let j=0;j<trailCount;j++) { const t=a-j*.035*(p.trail/trailCount); if(t<0) break;
            this.add(sparkPosition(p,t),p.color,(j===0?1.65:1.0)*(s.type==='Palm'?1.4:1),fade*pulse*(j===0?19:6)*(1-j/trailCount)*Math.sqrt(s.size)); }
        }
      }
    }
    if(droneShow)droneShow.append(time,(position,color,size,power)=>this.add(position,color,size,power));
    const gl=this.gl; gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,this.count*8));
  }
  draw(basis, aspect, tanF, height, atlas=false) {
    const gl=this.gl,p=this.program,u=p.u;
    gl.useProgram(p.p); gl.bindVertexArray(this.vao); gl.uniform3fv(u.uCam,basis.pos); gl.uniform3fv(u.uR,basis.r); gl.uniform3fv(u.uU,basis.u); gl.uniform3fv(u.uF,basis.f);
    gl.uniform1f(u.uAspect,aspect); gl.uniform1f(u.uTanF,tanF); gl.uniform1f(u.uHeight,height); gl.uniform1i(u.uAtlas,atlas?1:0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE); gl.drawArrays(gl.POINTS,0,this.count); gl.disable(gl.BLEND);
  }
  reflect(basis) { this.h.target(this.atlas); const gl=this.gl; gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); this.draw(basis,2,1,this.atlas.h,true); }
}
if(typeof module!=='undefined') module.exports={FireworkWorld,sparkPosition,FIREWORK_TYPES,fireworkSize,createShowPlan,FireworkSequence,SHOW_PRESETS};
