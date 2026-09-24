/* Distant fireworks: soft pressure waves, filtered effects, long bass tails. */
class BeachAudio {
  constructor() { this.context=null; this.muted=false; this.volume=.65; this.voices=new Set(); this.position=[0,1.55,0]; }
  initialize(context) {
    this.context=context; const c=context;
    this.master=c.createGain(); this.master.gain.value=this.muted?0:this.volume*.35;
    const air=c.createBiquadFilter(); air.type='lowpass'; air.frequency.value=680; air.Q.value=.5;
    const subsonic=c.createBiquadFilter(); subsonic.type='highpass'; subsonic.frequency.value=24; subsonic.Q.value=.5;
    const compressor=c.createDynamicsCompressor(); compressor.threshold.value=-19; compressor.knee.value=22; compressor.ratio.value=5; compressor.attack.value=.035; compressor.release.value=.8;
    this.master.connect(air);air.connect(subsonic);subsonic.connect(compressor);compressor.connect(c.destination);
    this.noise=c.createBuffer(1,c.sampleRate*12,c.sampleRate); const data=this.noise.getChannelData(0),random=fireworkRandom(829);
    // Correlated noise has body before filtering; there is no raw white-noise blast.
    let brown=0;
    for(let i=0;i<data.length;i++){brown=.996*brown+.028*(random()*2-1);data[i]=brown*2.2;}
  }
  async unlock() {
    if(!this.context)this.initialize(new AudioContext());
    if(this.context.state==='suspended')await this.context.resume();
  }
  setVolume(value) { this.volume=Math.max(0,Math.min(1,value));this.mute(this.muted); }
  mute(value) { this.muted=value;if(this.context)this.master.gain.setTargetAtTime(value?0:this.volume*.35,this.context.currentTime,.06); }
  cancel() {for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();}
  layer(position,when,{tone=0,endTone=30,cutoff=240,endCutoff=80,duration=2,attack=.05,amplitude=.4,roll=false,seed=1}={}) {
    const c=this.context;if(!c||this.voices.size>=192)return;
    const source=tone?c.createOscillator():c.createBufferSource();
    if(tone){source.type='sine';source.frequency.setValueAtTime(tone,when);source.frequency.exponentialRampToValueAtTime(endTone,when+duration);}
    else {source.buffer=this.noise;source.loop=true;}
    const filter=c.createBiquadFilter(),gain=c.createGain(),pan=c.createPanner();
    const distance=Math.hypot(...position.map((v,i)=>v-this.position[i])),airLoss=Math.min(1,350/Math.max(1,distance));
    filter.type='lowpass';filter.Q.value=.45;filter.frequency.setValueAtTime(Math.max(35,cutoff*airLoss),when);filter.frequency.exponentialRampToValueAtTime(Math.max(28,endCutoff*airLoss),when+duration);
    pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=170;pan.rolloffFactor=.85;
    pan.positionX.value=position[0];pan.positionY.value=position[1];pan.positionZ.value=position[2];
    const envelope=new Float32Array(256),random=fireworkRandom(seed),phase=random()*6.28;
    for(let i=0;i<envelope.length;i++) {
      const t=i/(envelope.length-1)*duration;
      const onset=1-Math.exp(-t/attack),decay=Math.exp(-t/(duration*(roll?.32:.20)));
      const swell=roll?.66+.22*Math.sin(t*3.1+phase)+.12*Math.sin(t*6.7):1;
      envelope[i]=amplitude*onset*decay*swell*Math.min(1,(duration-t)/.15);
    }
    envelope[0]=envelope[255]=0;gain.gain.setValueCurveAtTime(envelope,when,duration);
    source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.master);
    this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
    if(tone)source.start(when);else source.start(when,(seed%700)/100);source.stop(when+duration);
  }
  lift(position,when,size=1,seed=1) {
    const a=Math.sqrt(size);
    this.layer(position,when,{tone:74,endTone:38,cutoff:150,endCutoff:80,duration:.65,attack:.025,amplitude:.46*a});
    this.layer(position,when,{cutoff:210,endCutoff:65,duration:.9,attack:.04,amplitude:.3*a,seed});
    this.layer(position,when+.08,{cutoff:380,endCutoff:120,duration:.85,attack:.12,amplitude:.085*a,seed:seed+1});
  }
  boom(position,when,size=1,seed=1,type='Peony') {
    const a=Math.sqrt(size),random=fireworkRandom(seed);
    this.layer(position,when,{tone:58/Math.sqrt(size),endTone:27,cutoff:140,endCutoff:70,duration:2*a,attack:.03,amplitude:1.05*a});
    this.layer(position,when+.018,{cutoff:340,endCutoff:80,duration:3*a,attack:.045,amplitude:.8*a,seed});
    this.layer(position,when+.12,{cutoff:115,endCutoff:38,duration:7*a,attack:.22,amplitude:.64*a,roll:true,seed:seed+2});
    // A soft delayed terrain return, not another sharp detonation.
    this.layer(position,when+.55+random()*.3,{cutoff:145,endCutoff:48,duration:4.5*a,attack:.16,amplitude:.23*a,roll:true,seed:seed+3});
    if(type==='Crackle')for(let i=0;i<12;i++)this.layer(position,when+.65+random()*1.4,{cutoff:550,endCutoff:180,duration:.22+random()*.18,attack:.016,amplitude:.12*a,seed:seed+i});
    if(type==='Willow'||type==='Chrysanthemum')this.layer(position,when+.3,{cutoff:470,endCutoff:160,duration:3.5*a,attack:.3,amplitude:.055*a,seed:seed+4});
    // A restrained descending whistle on ring shells, distant rather than piercing.
    if(type==='Ring')this.layer(position,when+.16,{tone:520,endTone:290,cutoff:550,endCutoff:300,duration:1.4,attack:.2,amplitude:.012*a});
  }
  launch(shell,time,listener) {
    if(!this.context||this.context.state!=='running')return;
    const now=this.context.currentTime+.02;
    this.lift(shell.start,now,shell.size,shell.seed);
    const delay=Math.hypot(...shell.target.map((v,i)=>v-listener[i]))/343;
    this.boom(shell.target,now+Math.max(0,shell.burst-time)+delay,shell.size,shell.seed,shell.type);
  }
  listener(basis) {
    this.position=basis.pos;
    if(!this.context)return;const l=this.context.listener;
    for(const [prefix,vector] of [['position',basis.pos],['forward',basis.f],['up',basis.u]])for(let i=0;i<3;i++)l[prefix+'XYZ'[i]].value=vector[i];
  }
}
if(typeof module!=='undefined')module.exports={BeachAudio};
