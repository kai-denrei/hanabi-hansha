/* Unicode text -> a bounded fleet of colored lights. Browser fonts supply glyphs. */
function droneGraphemes(text) {
  return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(part=>part.segment);
}
function wrapDroneLines(text,measure,width) {
  const lines=[];
  for(const paragraph of text.split('\n')) {
    let line='';
    for(const glyph of droneGraphemes(paragraph)) {
      if(line && measure(line+glyph)>width){lines.push(line);line=glyph;}else line+=glyph;
    }
    lines.push(line);
  }
  return lines;
}
function sampleDronePixels(data,width,height,limit=4200) {
  let step=3,points=[];
  do {
    points=[];
    for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step) {
      let weight=0,px=0,py=0,r=0,g=0,b=0;
      for(let dy=0;dy<step&&y+dy<height;dy++)for(let dx=0;dx<step&&x+dx<width;dx++) {
        const i=((y+dy)*width+x+dx)*4,a=data[i+3]/255;
        if(a<.15)continue;weight+=a;px+=(x+dx)*a;py+=(y+dy)*a;r+=data[i]*a;g+=data[i+1]*a;b+=data[i+2]*a;
      }
      if(weight<.45)continue;
      const rgb=[r,g,b].map(v=>v/(weight*255));
      if(Math.max(...rgb)<.12)continue; // Dark emoji details remain negative space.
      const white=Math.min(...rgb)>.85;
      points.push({x:px/weight-width/2,y:height/2-py/weight,monochrome:white,color:white?[.42,.7,1]:rgb.map(v=>Math.pow(v,2.2))});
    }
    if(points.length>limit)step++;
  }while(points.length>limit);
  return {points,step};
}
function buildDroneFormation(text,aspect=1.5) {
  text=text.replace(/\r\n?/g,'\n').normalize('NFC').trim();
  if(!text)throw new Error('Write something for the sky first.');
  if(droneGraphemes(text).length>240)throw new Error('Please keep your message to 240 characters or fewer.');
  if(text.split('\n').length>8)throw new Error('Use up to eight lines for one formation.');
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d',{willReadFrequently:true});
  const maxWidth=Math.max(400,Math.min(1000,aspect*720)),padding=18;
  const font=size=>`600 ${size}px system-ui, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans CJK JP", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  let size=96,lines;
  do {c.font=font(size);lines=wrapDroneLines(text,s=>c.measureText(s).width,maxWidth);if(lines.length<=8)break;size-=4;}while(size>=12);
  const lineHeight=size*1.35;
  canvas.width=Math.ceil(Math.max(...lines.map(line=>c.measureText(line).width))+padding*2);
  canvas.height=Math.ceil(lines.length*lineHeight+padding*2);
  c.font=font(size);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';
  lines.forEach((line,i)=>c.fillText(line,canvas.width/2,padding+(i+.5)*lineHeight));
  const sampled=sampleDronePixels(c.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
  if(!sampled.points.length)throw new Error('That message has no visible shapes. Try some letters or an emoji.');
  return {text,canvas,width:canvas.width,height:canvas.height,...sampled};
}
function droneEase(t) {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
const DRONE_PATTERNS = [
  {id:'sphere',name:'Hovering sphere',icon:'◉'}, {id:'bird',name:'Wingbeat',icon:'⌁'},
  {id:'cube',name:'Prismatic cube',icon:'◇'}, {id:'helix',name:'Double helix',icon:'⧉'},
  {id:'heart',name:'Heartbeat',icon:'♡'}, {id:'saturn',name:'Saturn rings',icon:'♄'},
  {id:'flower',name:'Kaleidoscope',icon:'✿'}, {id:'ufo',name:'UFO landing',icon:'⌾'}
];
const DRONE_PACES={calm:21,normal:16,brisk:12};
function droneColor(value,palette='prism') {
  const h=palette==='aurora'?.38+.4*((Math.sin(value*6.283)+1)/2):palette==='ember'?.01+.13*((Math.sin(value*6.283)+1)/2):((value%1)+1)%1;
  const k=h*6,i=Math.floor(k),f=k-i,p=.025,q=1-.975*f,t=.025+.975*f;
  return [[1,t,p],[q,1,p],[p,1,t],[p,q,1],[t,p,1],[1,p,q]][i%6].map(v=>Math.pow(v,1.6));
}
function dronePattern(id,index,count,age) {
  const q=(index+.5)/count,a=q*Math.PI*2,u=(index*.61803398875)%1,v=(index*.41421356237)%1;
  let x=0,y=0,z=0,hue=q;
  if(id==='sphere') {
    y=1-2*q;const r=Math.sqrt(1-y*y),angle=index*2.39996323+age*.19;
    x=r*Math.cos(angle);z=r*Math.sin(angle);y+=.045*Math.sin(age*.8);hue=q*.7+age*.025;
  } else if(id==='bird') {
    if(q<.7){const side=q<.35?-1:1,span=.12+1.14*u;
      x=side*span;y=.12+.25*Math.sin(u*Math.PI)+Math.sin(age*1.65)*.42*u+(v-.5)*(.28*(1-u)+.045);z=(v-.5)*.25;hue=.46+u*.25;
    }else if(q<.84){const angle=u*Math.PI*2,r=Math.sqrt(v);x=Math.cos(angle)*.13*r;y=Math.sin(angle)*.4*r;z=.08*Math.cos(angle);hue=.13;}
    else if(q<.90){x=.1*Math.cos(u*6.283);y=.4+.12*Math.sin(u*6.283);z=(v-.5)*.1;hue=.12;}
    else if(q<.93){x=.075+u*.22;y=.4+(v-.5)*.13*(1-u);z=0;hue=.1;}
    else{x=(u-.5)*(.08+v*.38);y=-.3-v*.42;z=.05*Math.sin(u*6.283);hue=.52+v*.18;}
  } else if(id==='cube') {
    const edge=Math.floor(q*12),axis=edge%3,signs=Math.floor(edge/3),point=[];
    point[axis]=(q*12-edge)*1.5-.75;point[(axis+1)%3]=(signs&1)?.75:-.75;point[(axis+2)%3]=(signs&2)?.75:-.75;
    const angle=age*.22,c=Math.cos(angle),s=Math.sin(angle);
    x=point[0]*c-point[2]*s;z=point[0]*s+point[2]*c;y=point[1]*.96+x*.2;hue=edge/12+age*.025;
  } else if(id==='helix') {
    const side=index%2,t=Math.floor(index/2)/Math.ceil(count/2),angle=t*Math.PI*5+side*Math.PI+age*.7;
    x=.57*Math.cos(angle);z=.57*Math.sin(angle);y=(t-.5)*2.05;hue=side===0?.51+t*.15:.85+t*.14;
  } else if(id==='heart') {
    const angle=u*Math.PI*2,layer=.72+.28*v,beat=1+.045*Math.pow(Math.max(0,Math.sin(age*2.4)),4);
    x=16*Math.pow(Math.sin(angle),3)/17*layer*beat;
    y=(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))/17*layer*beat;
    z=.07*Math.sin(angle+age*.3);hue=.87+v*.13;
  } else if(id==='saturn') {
    if(q<.57){y=(1-2*q/.57)*.52;const r=Math.sqrt(Math.max(0,.52*.52-y*y)),angle=index*2.399963+age*.3;x=r*Math.cos(angle);z=r*Math.sin(angle);hue=.1+y*.12;}
    else{const angle=u*Math.PI*2+age*.19,r=.83+v*.36;x=Math.cos(angle)*r;y=Math.sin(angle)*r*(.55+.1*Math.sin(age*.2));z=Math.sin(angle)*r*.68;hue=.49+v*.28;}
  } else if(id==='flower') {
    const angle=u*Math.PI*2+age*.16,r=(.34+.65*Math.pow(.5+.5*Math.cos(u*Math.PI*12),.7))*(.65+v*.35);
    x=Math.cos(angle)*r;y=Math.sin(angle)*r;z=.15*Math.sin(u*Math.PI*12+age*.5);hue=u+age*.035;
  } else if(id==='ufo') {
    const descent=droneEase((age-3)/8),angle=u*Math.PI*2+age*.25;
    if(q<.6){const r=.6+v*.6;x=Math.cos(angle)*r;z=Math.sin(angle)*r;y=.04+.15*(1-v)-descent*1.35;hue=.5+v*.22;}
    else if(q<.84){const r=.56*Math.sqrt(v);x=Math.cos(angle)*r;z=Math.sin(angle)*r;y=.18+.42*Math.sqrt(1-v)-descent*1.35;hue=.72+v*.15;}
    else if(q<.94){const r=.08+v*.42;x=Math.cos(angle)*r;z=Math.sin(angle)*r;y=-.12-v*1.2-descent*(1-v)*1.1;hue=.35+v*.15;}
    else{x=Math.cos(angle)*1.28;z=Math.sin(angle)*1.28;y=-1.56;hue=.34;}
  }
  return {position:[x,y,z],hue};
}
class DroneShow {
  constructor(){this.drones=[];this.start=0;this.landAt=Infinity;this.custom=null;this.gentle=false;}
  active(time){return this.drones.length>0&&time<this.landAt+6;}
  configure(basis,aspect,tanF) {
    const length=Math.hypot(basis.f[0],basis.f[2]);this.forward=[basis.f[0]/length,0,basis.f[2]/length];this.right=[-this.forward[2],0,this.forward[0]];
    this.width=Math.min(300,640*tanF*aspect*.8);this.scale=Math.min(65,this.width/2.7);
    this.center=basis.pos.map((v,i)=>v+this.forward[i]*320);this.center[1]=110;
  }
  startShow(time,basis,aspect,tanF,settings={},formation=this.custom,startIndex=0) {
    const previous=this.active(time)?this.drones.map(drone=>this.pose(drone,time)):[];
    this.custom=formation;this.text=formation?.text||'';this.settings={pace:'normal',palette:'prism',loop:true,...settings};
    this.stageDuration=DRONE_PACES[this.settings.pace]||16;this.transition=this.stageDuration*.3;
    const first=Math.max(0,Math.min(DRONE_PATTERNS.length-1,startIndex));
    const shapes=DRONE_PATTERNS.map((_,i)=>DRONE_PATTERNS[(first+i)%DRONE_PATTERNS.length].id);
    // Message, two shapes, message: repeat across the cycle boundary as well.
    this.patterns=this.custom?shapes.flatMap((id,i)=>i%2===0?['message',id]:[id]):shapes;
    this.startIndex=0;
    this.configure(basis,aspect,tanF);this.start=time;this.landAt=this.settings.loop?Infinity:time+this.patterns.length*this.stageDuration;
    const count=Math.max(960,this.custom?.points.length||0),drones=[];
    for(let i=0;i<count;i++) {
      const u=(i*.61803398875)%1,v=(i*.41421356237)%1;
      const home=this.center.map((value,k)=>k===1?5+v*3:value+this.right[k]*(u-.5)*this.width+this.forward[k]*(v-.5)*22);
      drones.push({index:i,home,origin:previous[i]?.position||home,originColor:previous[i]?.color||droneColor(u,this.settings.palette),reused:!!previous[i],phase:u*Math.PI*2});
    }
    // Surplus craft from a previous message descend instead of disappearing.
    for(let i=count;i<previous.length;i++)drones.push({index:i,home:this.drones[i].home,origin:previous[i].position,originColor:previous[i].color,phase:0,retiring:true,reused:true});
    this.count=count;this.drones=drones;this.spacing=1.2;
  }
  form(formation,time,basis,aspect,tanF,settings=this.settings) {this.startShow(time,basis,aspect,tanF,settings,formation,0);}
  phase(time) {
    const elapsed=Math.max(0,time-this.start),stage=Math.floor(elapsed/this.stageDuration),index=(this.startIndex+stage)%this.patterns.length;
    return {stage,index,local:elapsed-stage*this.stageDuration,id:this.patterns[index]};
  }
  status(time) {if(!this.active(time))return 'Ready for takeoff';if(time>=this.landAt)return 'Landing the fleet';const p=this.phase(time);return `${p.index+1} / ${this.patterns.length} · ${p.id==='message'?'Your message':DRONE_PATTERNS.find(pattern=>pattern.id===p.id).name}`;}
  target(id,index,age) {
    if(id==='message') {
      if(index>=this.custom.points.length)return {position:this.drones[index].home,color:[0,0,0]};
      const point=this.custom.points[index],scale=Math.min(this.width/this.custom.width,150/this.custom.height);
      const position=this.center.map((v,k)=>v+this.right[k]*point.x*scale+(k===1?point.y*scale:0));
      return {position,color:point.monochrome?droneColor(point.x/this.custom.width+.5+age*.025,this.settings.palette):point.color};
    }
    const sample=dronePattern(id,index,this.count,age*(this.gentle?.65:1));
    const position=this.center.map((v,k)=>v+this.right[k]*sample.position[0]*this.scale+this.forward[k]*sample.position[2]*this.scale+(k===1?sample.position[1]*this.scale:0));
    position[1]=Math.max(7,position[1]);
    return {position,color:droneColor(sample.hue,this.settings.palette)};
  }
  flight(drone,time) {
    if(drone.retiring){const q=droneEase((time-this.start)/6);return {position:drone.origin.map((v,i)=>v+(drone.home[i]-v)*q),color:drone.originColor,power:3*(1-q)};}
    const phase=this.phase(time),q=droneEase(phase.local/this.transition),dest=this.target(phase.id,drone.index,phase.local);
    const source=phase.stage===0?{position:drone.origin,color:drone.originColor}:this.target(this.patterns[(phase.index+this.patterns.length-1)%this.patterns.length],drone.index,this.stageDuration+phase.local);
    const position=source.position.map((v,i)=>v+(dest.position[i]-v)*q),color=source.color.map((v,i)=>v+(dest.color[i]-v)*q);
    // Tiny individual station-keeping offsets preserve the synchronized silhouette.
    const hover=(this.gentle?.035:.13)*Math.min(1,(time-this.start)/3);
    for(let i=0;i<3;i++)position[i]+=hover*Math.sin(time*(.63+i*.19)+drone.phase+i*2);
    const fade=phase.stage===0&&!drone.reused?Math.min(1,(time-this.start)*1.5):1;
    return {position,color,power:4.5*fade};
  }
  land(time){this.landAt=Math.min(this.landAt,time);}
  pose(drone,time) {
    if(time>=this.landAt){const frozen=this.flight(drone,this.landAt),q=droneEase((time-this.landAt)/6);return {position:frozen.position.map((v,i)=>v+(drone.home[i]-v)*q),color:frozen.color,power:frozen.power*(1-q*.9)};}
    return this.flight(drone,time);
  }
  append(time,add) {
    if(!this.active(time)){this.drones=[];return;}
    for(const drone of this.drones){const p=this.pose(drone,time);if(p.power>.015)add(p.position,p.color,.95,p.power);}
  }
}
if(typeof module!=='undefined')module.exports={droneGraphemes,wrapDroneLines,sampleDronePixels,DroneShow,DRONE_PATTERNS,dronePattern,droneColor};
