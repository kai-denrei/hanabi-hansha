function hanabiShareURL(base,message) {
  const url=new URL(base);url.search='?auto';
  url.hash=encodeURIComponent(message.replace(/\r\n?/g,'\n').normalize('NFC').trim());
  return url.href;
}
function hanabiSharedShow(href) {
  const url=new URL(href);
  try {return {autoplay:url.searchParams.has('auto'),message:decodeURIComponent(url.hash.slice(1)),error:''};}
  catch {return {autoplay:false,message:'',error:'This message link is damaged. Please ask for a new copy.'};}
}
class BeachExperience {
  constructor(hooks) {
    this.h=hooks;this.type='Willow';this.audio=new BeachAudio();this.basis=null;this.auto=null;this.charge=null;this.preset='gold';
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.dialCanvas=document.createElement('canvas');this.dialCanvas.width=this.dialCanvas.height=1024;
    document.body.insertAdjacentHTML('beforeend', `
      <button id="celestial-hit" class="world-control" aria-label="Switch to daytime" title="Touch the moon to welcome the day"></button>
      <button id="gear-hit" class="world-control" aria-label="Underwater settings and credits" title="Underwater settings and credits"></button>
      <button id="drone-hit" class="world-control" aria-label="Create a drone show" title="Write something in the sky"></button>
      <button id="launcher" class="world-control" aria-label="Choose a firework underwater" aria-expanded="false" aria-controls="radial" title="Choose a firework underwater"></button>
      <div id="radial" role="group" aria-label="Underwater firework dial" hidden><button id="auto-dial" aria-label="Start auto show" title="Start auto show"></button></div>
      <div id="reticle" hidden><span></span></div>
      <section id="settings" role="dialog" aria-modal="false" aria-labelledby="settings-title" hidden>
        <button class="close" aria-label="Close settings">×</button><h2 id="settings-title">Settings</h2>
        <div class="settings-show">
          <button id="auto-toggle" class="primary">Start auto show</button>
          <select id="show-preset" aria-label="Fireworks show"><option value="gold">Golden tide · 60s</option><option value="festival">Summer festival · 90s</option><option value="quiet">Quiet embers · 45s</option></select>
          <p id="show-status" class="sr-only" aria-live="polite"></p>
        </div>
        <div class="settings-options">
          <label>Sound <input id="sound-toggle" type="checkbox" checked></label>
          <label>Volume <input id="volume" type="range" min="0" max="100" value="65" aria-label="Sound volume"></label>
          <label>Gentler effects <input id="gentle-toggle" type="checkbox"></label>
        </div>
        <footer class="settings-footer">
          <button id="install-app" hidden>Install Hanabi</button><p id="install-help" hidden aria-live="polite"></p>
          <p>Water · <a href="https://x.com/Aurelien_Gz" target="_blank" rel="noopener">Aurélien</a> / <a href="https://lumaris.works" target="_blank" rel="noopener">Lumaris</a><br>Fireworks · <strong>Kai Denrei</strong> · <a href="LICENSE" target="_blank" rel="noopener">MIT</a></p>
        </footer>
      </section>
      <dialog id="drone-composer" aria-labelledby="drone-title">
        <form id="drone-form">
          <button class="close" type="button" aria-label="Close drone composer">×</button>
          <div class="drone-message">
            <h2 id="drone-title"><label for="drone-text">Add your own formation</label></h2>
            <textarea id="drone-text" rows="2" placeholder="Your message · 夏の夜 ✨" spellcheck="false" dir="auto" aria-describedby="drone-help drone-error"></textarea>
            <p id="drone-help">Your message first, then every third formation.</p>
            <p id="drone-error" role="status" aria-live="polite"></p>
            <div class="drone-launch-actions"><button id="drone-start" class="primary" type="submit" autofocus>Start drone show</button><button id="drone-share" type="button" aria-label="Copy autoplay link">Copy link ⧉</button></div>
            <input id="drone-share-link" type="text" readonly hidden aria-label="Share link — select and copy">
            <span id="drone-share-status" class="sr-only" role="status"></span>
          </div>
          <div class="drone-controls">
            <div id="drone-patterns" aria-label="First preset formation"></div>
            <div class="drone-options">
              <label>Colors<select id="drone-palette"><option value="prism">Prism</option><option value="aurora">Aurora</option><option value="ember">Ember</option></select></label>
              <label>Pace<select id="drone-pace"><option value="normal">Unhurried</option><option value="calm">Slow</option><option value="brisk">Lively</option></select></label>
            </div>
            <div class="drone-actions"><label class="drone-loop"><input id="drone-loop" type="checkbox" checked> Repeat</label><button id="drone-land" type="button">Land drones</button></div>
            <p id="drone-sequence-status" class="sr-only" aria-live="polite"></p>
          </div>
        </form>
      </dialog>`);
    this.sun=document.getElementById('celestial-hit');this.gear=document.getElementById('gear-hit');this.radial=document.getElementById('radial');this.settings=document.getElementById('settings');this.launcher=document.getElementById('launcher');this.reticle=document.getElementById('reticle');this.autoDial=document.getElementById('auto-dial');
    document.getElementById('credit').remove();
    this.droneStartIndex=0;
    this.droneButton=document.getElementById('drone-hit');this.droneDialog=document.getElementById('drone-composer');this.droneText=document.getElementById('drone-text');
    DRONE_PATTERNS.forEach((pattern,index)=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Start with ${pattern.name}`);
      button.innerHTML=`<span aria-hidden="true">${pattern.icon}</span><small>${pattern.name}</small>`;
      button.setAttribute('aria-pressed',String(index===0));
      button.onclick=()=>{this.droneStartIndex=index;document.querySelectorAll('#drone-patterns button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));};document.getElementById('drone-patterns').append(button);
    });
    this.droneButton.onclick=()=>this.openDroneComposer();
    document.getElementById('drone-share').onclick=()=>this.copyDroneLink();
    const shared=hanabiSharedShow(location.href);
    this.droneText.value=shared.message;this.shareError=shared.error;
    document.fonts.ready.then(()=>{this.sharedReady=shared.autoplay&&!hooks.frozen;});
    if(shared.autoplay){
      const unlock=()=>{if(!this.audio.muted)this.audio.unlock().catch(()=>{});};
      document.addEventListener('pointerdown',unlock,{once:true});
      document.addEventListener('keydown',unlock,{once:true});
    }
    this.droneDialog.querySelector('.close').onclick=()=>this.droneDialog.close();
    this.droneDialog.addEventListener('close',()=>{this.composing=false;this.droneButton.focus({preventScroll:true});});
    this.droneDialog.addEventListener('cancel',e=>{if(this.composing)e.preventDefault();});
    this.droneText.addEventListener('compositionstart',()=>{this.composing=true;});
    this.droneText.addEventListener('compositionend',()=>{this.composing=false;this.previewDrones();});
    this.droneText.addEventListener('input',()=>{clearTimeout(this.previewTimer);this.previewTimer=setTimeout(()=>{if(!this.composing)this.previewDrones();},120);});
    this.droneText.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing&&!this.composing){e.preventDefault();document.getElementById('drone-form').requestSubmit();}});
    document.getElementById('drone-form').onsubmit=e=>{e.preventDefault();if(!this.composing)this.launchDrones();};
    document.getElementById('drone-land').onclick=()=>{this.h.droneShow.land(this.h.time());this.droneDialog.close();this.hint('The lights are coming home');};
    FIREWORK_TYPES.forEach((type,i)=>{
      const b=document.createElement('button');b.className='choice';b.setAttribute('aria-label',type);b.title=type;b.setAttribute('aria-pressed',String(type===this.type));
      b.onclick=()=>{this.type=type;this.toggleDial(false);this.hint(`${type} · tap for small, hold for large`);this.h.canvas.focus({preventScroll:true});};
      b.onpointerenter=()=>{this.hover=i;this.drawDial();this.hint(type);};b.onpointerleave=()=>{this.hover=-1;this.drawDial();};
      b.onfocus=()=>{this.hover=i;this.drawDial();};
      b.onkeydown=e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();const buttons=[...this.radial.querySelectorAll('.choice')];buttons[(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:5))%6].focus();}};
      this.radial.append(b);
    });
    this.launcher.onclick=()=>{this.audio.unlock().catch(()=>{});this.toggleDial(this.radial.hidden);};
    this.sun.onclick=()=>{hooks.toggleNight();this.hint(hooks.isNight()?'Moonlit water · hold the sky for a bigger bloom':'Sunlit water · touch the sun for night');};
    this.gear.onclick=()=>{this.settings.hidden=!this.settings.hidden;this.toggleDial(false);if(!this.settings.hidden){document.getElementById('hint').classList.add('off');this.settings.querySelector('.close').focus();}};
    this.settings.querySelector('.close').onclick=()=>{this.settings.hidden=true;this.gear.focus();};
    document.getElementById('sound-toggle').onchange=e=>{this.audio.mute(!e.target.checked);if(e.target.checked)this.audio.unlock().catch(()=>{});};
    document.getElementById('volume').oninput=e=>this.audio.setVolume(Number(e.target.value)/100);
    const gentle=document.getElementById('gentle-toggle');gentle.checked=this.reduced;gentle.onchange=e=>this.reduced=e.target.checked;
    document.getElementById('show-preset').onchange=e=>{this.stopAuto();this.preset=e.target.value;this.drawDial();};
    document.getElementById('auto-toggle').onclick=()=>this.toggleAuto();this.autoDial.onclick=()=>this.toggleAuto();
    window.addEventListener('keydown',e=>{
      if(e.isComposing||this.composing)return;
      if(e.key==='Escape'&&this.droneDialog.open){e.preventDefault();this.droneDialog.close();return;}
      if(e.key==='Escape'){this.cancelCharge();this.h.cancelInput();this.toggleDial(false);this.settings.hidden=true;this.h.canvas.focus({preventScroll:true});}
      if(e.code==='Space'&&(e.target===document.body||e.target===hooks.canvas)){
        e.preventDefault();if(!e.repeat&&!this.charge){this.audio.unlock().catch(()=>{});this.beginCharge(innerWidth*.5,innerHeight*.3,true);}
      }
    });
    window.addEventListener('keyup',e=>{if(e.code==='Space'&&this.charge?.keyboard){e.preventDefault();const c=this.charge;this.cancelCharge();this.launchAt(c.x,c.y,(performance.now()-c.started)/1000);}});
    hooks.canvas.addEventListener('pointerdown',()=>{this.audio.unlock().catch(()=>{});hooks.canvas.focus({preventScroll:true});});
    hooks.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    hooks.canvas.addEventListener('pointermove',e=>{if(this.charge)return;this.reticle.hidden=e.buttons!==0||e.pointerType==='touch'||!this.target(e.clientX,e.clientY)||!this.radial.hidden||!this.settings.hidden;this.positionReticle(e.clientX,e.clientY,0);});
    hooks.canvas.addEventListener('pointerleave',()=>{if(!this.charge)this.reticle.hidden=true;});
    window.addEventListener('blur',()=>{this.cancelCharge();hooks.cancelInput();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.stopAuto();this.cancelCharge();hooks.cancelInput();this.audio.cancel();hooks.clear();}});
    this.drawDial();this.hint(shared.error||'Choose a bloom in the water · tap or hold the sky');
  }
  openDroneComposer() {
    this.cancelCharge();this.h.cancelInput();this.toggleDial(false);this.settings.hidden=true;
    document.getElementById('hint').classList.add('off');
    document.getElementById('drone-land').disabled=!this.h.droneShow.active(this.h.time());
    this.droneDialog.showModal();document.getElementById('drone-start').focus();this.previewDrones();
    if(this.shareError){document.getElementById('drone-error').textContent=this.shareError;this.shareError='';}
  }
  droneSettings() {return {palette:document.getElementById('drone-palette').value,pace:document.getElementById('drone-pace').value,loop:document.getElementById('drone-loop').checked};}
  startDroneSequence(index=this.droneStartIndex) {
    if(!this.basis||this.h.frozen)return;
    this.h.droneShow.startShow(this.h.time(),this.basis,innerWidth/innerHeight,this.h.tanF,this.droneSettings(),this.formation,index);
    this.h.frameDrones();if(!this.h.isNight())this.h.toggleNight();
    this.droneDialog.close();this.hint('A fleet of lights · watch the sky come alive');
  }
  previewDrones() {
    const error=document.getElementById('drone-error');
    this.formation=null;error.textContent='';
    if(!this.droneText.value.trim())return;
    try {this.formation=buildDroneFormation(this.droneText.value,innerWidth/innerHeight);}
    catch(e) {error.textContent=e.message;}
  }
  async launchDrones() {
    if(this.droneLaunching||this.h.frozen)return;
    this.droneLaunching=true;
    try {
      await document.fonts.ready;
      if(!this.droneDialog.open||this.composing||!this.basis)return;
      this.previewDrones();if(this.droneText.value.trim()&&!this.formation)return;
      this.startDroneSequence();
    } finally {this.droneLaunching=false;}
  }
  async copyDroneLink() {
    if(this.composing)return;
    this.previewDrones();if(this.droneText.value.trim()&&!this.formation)return;
    const link=hanabiShareURL(location.href,this.droneText.value),button=document.getElementById('drone-share');
    const fallback=document.getElementById('drone-share-link'),status=document.getElementById('drone-share-status');
    fallback.hidden=true;clearTimeout(this.copyTimer);button.textContent='Copy link ⧉';
    try {
      await navigator.clipboard.writeText(link);
      button.textContent='Copied ✓';status.textContent='Autoplay link copied';
      clearTimeout(this.copyTimer);this.copyTimer=setTimeout(()=>button.textContent='Copy link ⧉',2200);
    } catch {
      fallback.value=link;fallback.hidden=false;fallback.focus();fallback.select();
      status.textContent='Copy the selected link';
    }
  }
  startSharedShow() {
    this.sharedReady=false;
    this.previewDrones();
    if(this.droneText.value.trim()&&!this.formation){this.openDroneComposer();return;}
    this.startDroneSequence();this.startAuto();
    this.hint('Your sky is playing · tap for sound');
  }
  hint(text) {const el=document.getElementById('hint');el.textContent=text;el.classList.remove('off');clearTimeout(this.hintTimer);this.hintTimer=setTimeout(()=>el.classList.add('off'),6000);}
  toggleDial(open) {
    this.radial.hidden=!open;this.launcher.setAttribute('aria-expanded',String(open));this.cancelCharge();this.hover=-1;
    for(const c of this.radial.querySelectorAll('.choice'))c.setAttribute('aria-pressed',String(c.getAttribute('aria-label')===this.type));
    if(open){this.settings.hidden=true;this.hint('Choose a bloom · center starts an auto show');}
    this.drawDial();if(this.basis)this.positionControls(this.basis);
    if(open)this.radial.querySelector('[aria-pressed=true]').focus();
  }
  drawDial() {
    const c=this.dialCanvas.getContext('2d'),open=!this.radial.hidden;c.clearRect(0,0,1024,1024);
    c.fillStyle='rgba(18,43,47,.88)';c.strokeStyle='rgba(173,201,182,.65)';c.lineWidth=open?7:24;
    c.beginPath();c.arc(512,512,480,0,Math.PI*2);c.fill();c.stroke();
    const symbol=(kind,x,y,r,color)=>{
      c.save();c.translate(x,y);c.scale(1,open?2.8:2.8);c.strokeStyle=color;c.lineWidth=open?6:15;
      const count=kind===3?7:kind===4?18:12;
      for(let i=0;i<count;i++){const a=i/count*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a);c.beginPath();
        if(kind===4)c.arc(dx*r,dy*r*.7,2.5,0,Math.PI*2);
        else if(kind===2||kind===3){c.moveTo(0,r*.4);c.quadraticCurveTo(dx*r,-r+dy*r*.5,dx*r,r*.3+dy*r*.6);}
        else{c.moveTo(dx*r*.25,dy*r*.25);c.lineTo(dx*r,dy*r);}c.stroke();}
      c.restore();
    };
    if(!open){symbol(FIREWORK_TYPES.indexOf(this.type),512,512,190,this.auto?'#ffe0a0':'#c6d9b9');}
    else {
      c.strokeStyle='#819c8555';c.lineWidth=3;c.beginPath();c.arc(512,512,218,0,Math.PI*2);c.stroke();
      FIREWORK_TYPES.forEach((type,i)=>{const a=i/6*Math.PI*2-Math.PI/2,x=512+Math.cos(a)*340,y=512+Math.sin(a)*340;
        const color=this.hover===i||type===this.type?'#ffe0a0':'#a5c2bd';symbol(i,x,y-22,35,color);
        c.save();c.translate(x,y+90);c.scale(1,2.7);c.textAlign='center';c.font='34px system-ui';c.fillStyle=color;c.fillText(type,0,0);c.restore();});
      c.save();c.translate(512,485);c.scale(1,2.2);c.textAlign='center';c.fillStyle='#eadcb1';c.font='42px system-ui';c.fillText(this.auto?'STOP':'AUTO',0,0);c.font='23px system-ui';c.fillStyle='#9db8b3';c.fillText(this.auto?'SHOW':SHOW_PRESETS[this.preset].name.toUpperCase(),0,40);c.restore();
    }
    this.h.uploadDial(this.dialCanvas);
  }
  async toggleAuto() {
    if(this.auto){this.stopAuto();this.hint('Auto show stopped · the last blooms will fade');return;}
    if(this.starting)return;this.starting=true;await this.audio.unlock().catch(()=>{});this.starting=false;
    this.startAuto();
  }
  startAuto() {
    if(this.auto||document.hidden||!this.basis||this.h.frozen)return;
    const b=this.basis,n=Math.hypot(b.f[0],b.f[2]);this.showForward=[b.f[0]/n,0,b.f[2]/n];this.showRight=[-this.showForward[2],0,this.showForward[0]];
    this.showOrigin=[...b.pos];this.showWidth=Math.min(145,innerWidth/innerHeight*150);
    this.auto=new FireworkSequence(this.preset,this.h.time());this.finaleAnnounced=false;
    if(!this.h.isNight())this.h.toggleNight();
    this.settings.hidden=true;this.toggleDial(false);this.syncAutoUI();this.hint(`${this.auto.plan.name} · settle in`);
  }
  stopAuto() {this.auto=null;this.syncAutoUI();}
  syncAutoUI() {
    const label=this.auto?'Stop auto show':'Start auto show';document.getElementById('auto-toggle').textContent=label;this.autoDial.setAttribute('aria-label',label);this.autoDial.title=label;
    document.getElementById('show-status').textContent=this.auto?`${this.auto.plan.name} is playing. A grand finale awaits.`:'Solos, a rising rhythm, then a grand finale.';this.drawDial();
  }
  target(x,y) {
    if(!this.basis)return null;const b=this.basis,tf=this.h.tanF,nx=x/innerWidth*2-1,ny=1-y/innerHeight*2;
    const d=b.f.map((v,i)=>v+nx*(innerWidth/innerHeight)*tf*b.r[i]+ny*tf*b.u[i]),horizontal=Math.hypot(d[0],d[2]);
    if(d[1]/horizontal<.12||d[1]/horizontal>1.2)return null;
    const scale=300/horizontal;return b.pos.map((v,i)=>v+d[i]*scale);
  }
  beginCharge(x,y,keyboard=false) {
    if(!this.radial.hidden||!this.settings.hidden||!this.target(x,y))return;
    this.charge={x,y,keyboard,started:performance.now()};this.reticle.hidden=false;this.positionReticle(x,y,0);
  }
  cancelCharge() {this.charge=null;this.reticle.hidden=true;this.reticle.classList.remove('charging');}
  positionReticle(x,y,held) {
    this.reticle.style.left=x+'px';this.reticle.style.top=y+'px';const fraction=Math.min(1,held/1.92);
    this.reticle.style.setProperty('--charge',fraction);this.reticle.style.setProperty('--diameter',(26+fraction*48)+'px');this.reticle.classList.toggle('charging',!!this.charge);
    this.reticle.querySelector('span').textContent=this.charge?(fraction>.94?'LARGE':fraction>.4?'MEDIUM':'SMALL'):'';
  }
  emit(type,target,size=1,seed,at) {const shell=this.h.launch(type,target,size,seed,at);if(shell&&!this.h.frozen)this.audio.launch(shell,this.h.time(),this.basis.pos);return shell;}
  launchAt(x,y,held=0) {
    if(!this.radial.hidden){this.toggleDial(false);return true;}if(!this.settings.hidden){this.settings.hidden=true;return true;}
    const target=this.target(x,y);if(!target)return false;
    const shell=this.emit(this.type,target,fireworkSize(held));this.hint(shell?`${this.type} · watch, then listen`:'Let these blooms fade before the next launch');return true;
  }
  project(point,button,basis) {
    const d=point.map((v,i)=>v-basis.pos[i]),dot=v=>v.reduce((s,x,i)=>s+x*d[i],0),z=dot(basis.f);
    const x=(.5+.5*dot(basis.r)/(z*this.h.tanF*(innerWidth/innerHeight)))*innerWidth,y=(.5-.5*dot(basis.u)/(z*this.h.tanF))*innerHeight;
    button.hidden=z<=0||x<0||x>innerWidth||y<0||y>innerHeight;button.style.left=x+'px';button.style.top=y+'px';
  }
  projectSubmerged(xz,button,basis) {
    // Invert Snell's law for the flat surface; hit areas allow for local wave distortion.
    const dx=xz[0]-basis.pos[0],dz=xz[1]-basis.pos[2],distance=Math.hypot(dx,dz);let lo=0,hi=distance;
    for(let i=0;i<16;i++){const air=(lo+hi)/2,s=air/Math.hypot(air,basis.pos[1]),under=.25*s/Math.sqrt(1.3335**2-s*s);if(air+under>distance)hi=air;else lo=air;}
    const q=(lo+hi)/2/Math.max(.001,distance);this.project([basis.pos[0]+dx*q,0,basis.pos[2]+dz*q],button,basis);
  }
  positionControls(basis) {
    this.gearPosition=[-Math.min(2,innerWidth/innerHeight*1.4),-5.5];this.dialPosition=[innerWidth/innerHeight<.8?0:.8,-5.8];
    this.dronePosition=[Math.min(2.3,innerWidth/innerHeight*1.4),-5.5];
    this.projectSubmerged(this.dronePosition,this.droneButton,basis);this.droneButton.hidden=this.droneButton.hidden||!this.radial.hidden;
    this.dialStretch=!this.radial.hidden&&matchMedia('(pointer: coarse)').matches?2:1;
    this.dialRadius=this.radial.hidden?.23:Math.min(1.55,innerWidth/innerHeight*3.0);
    if(this.dialStretch>1&&innerHeight<650){this.dialPosition[1]=-6.6;this.dialRadius=Math.min(this.dialRadius,1.35);}
    this.projectSubmerged(this.gearPosition,this.gear,basis);this.gear.hidden=this.gear.hidden||!this.radial.hidden;this.projectSubmerged(this.dialPosition,this.launcher,basis);
    this.launcher.hidden=this.launcher.hidden||!this.radial.hidden;
    if(!this.radial.hidden){this.projectSubmerged(this.dialPosition,this.autoDial,basis);
      this.radial.querySelectorAll('.choice').forEach((button,i)=>{const a=i/6*Math.PI*2-Math.PI/2,r=this.dialRadius*340/512;this.projectSubmerged([this.dialPosition[0]+Math.cos(a)*r,this.dialPosition[1]+Math.sin(a)*r*this.dialStretch],button,basis);});}
  }
  update(basis) {
    this.basis=basis;this.audio.listener(basis);this.positionControls(basis);
    if(this.sharedReady&&!document.hidden)this.startSharedShow();
    this.h.droneShow.gentle=this.reduced;
    if(this.droneDialog.open){
      const status=this.h.droneShow.status(this.h.time()),label=document.getElementById('drone-sequence-status');if(label.textContent!==status)label.textContent=status;
      document.getElementById('drone-land').disabled=!this.h.droneShow.active(this.h.time());
    }
    this.project(basis.pos.map((v,i)=>v+this.h.sun[i]*1000),this.sun,basis);
    this.sun.setAttribute('aria-label',this.h.isNight()?'Switch to daytime':'Switch to nighttime');this.sun.title=this.h.isNight()?'Touch the moon to welcome the day':'Touch the sun to welcome the night';
    if(this.charge)this.positionReticle(this.charge.x,this.charge.y,(performance.now()-this.charge.started)/1000);
    if(this.auto&&!this.h.frozen){
      const sequence=this.auto,time=this.h.time();
      sequence.update(time,(event,at)=>{const p=this.showOrigin.map((v,i)=>v+this.showForward[i]*330+this.showRight[i]*event.x*this.showWidth);p[1]=event.height;this.emit(event.type,p,event.size,event.seed,at);});
      if(!this.finaleAnnounced&&time-sequence.start>=sequence.plan.finaleAt){this.finaleAnnounced=true;this.hint('The grand finale');}
      if(sequence.done){this.stopAuto();this.hint('The last light on the water · show complete');}
    }
  }
}

if(typeof module!=='undefined')module.exports={hanabiShareURL,hanabiSharedShow};
