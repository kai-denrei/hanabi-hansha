const {test}=require('node:test');
const assert=require('node:assert/strict');
const {droneGraphemes,wrapDroneLines,sampleDronePixels,DroneShow,DRONE_PATTERNS,dronePattern,droneColor}=require('../drones.js');

test('Japanese, combining marks, flags, and joined emoji remain whole when wrapping',()=>{
  const text='夏👨‍👩‍👧‍👦🇯🇵e\u0301❤️';
  assert.equal(droneGraphemes(text).length,5);
  const lines=wrapDroneLines(text,s=>droneGraphemes(s).length,1);
  assert.deepEqual(lines,['夏','👨‍👩‍👧‍👦','🇯🇵','e\u0301','❤️']);
  assert.deepEqual(wrapDroneLines('空\n\n海',s=>s.length,10),['空','','海']);
});

test('sampling retains colored shapes and stays within the fleet budget',()=>{
  const width=200,height=100,data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<data.length;i+=4){data[i]=255;data[i+3]=255;}
  const sampled=sampleDronePixels(data,width,height,300);
  assert.ok(sampled.points.length>100&&sampled.points.length<=300);
  assert.ok(sampled.points.every(p=>p.color[0]===1&&p.color[1]===0&&p.color[2]===0));
  assert.equal(sampleDronePixels(new Uint8ClampedArray(400),10,10).points.length,0);
});

test('drones assemble, morph from their current locations, and finish landing',()=>{
  const show=new DroneShow(),basis={pos:[0,1.55,0],f:[0,0,-1]};
  const formation={text:'空',width:100,height:100,step:3,points:[{x:-20,y:20,color:[1,0,0]},{x:20,y:-20,color:[0,0,1]}]};
  show.form(formation,0,basis,1.4,.625);
  for(const drone of show.drones.slice(0,formation.points.length)){
    const pose=show.pose(drone,7);
    assert.ok(pose.position.every(Number.isFinite));
    assert.ok(Math.hypot(...pose.position.map((v,i)=>v-show.target('message',drone.index,7).position[i]))<.3);
  }
  const previous=show.pose(show.drones[0],8).position;
  show.form({...formation,text:'海',points:[formation.points[0]]},8,basis,.46,.625);
  assert.deepEqual(show.drones[0].origin,previous);
  assert.deepEqual(show.target('message',1,0).color,[0,0,0]);
  assert.ok(show.pose(show.drones[0],8).power>0);
  show.land(10);assert.equal(show.active(12),true);
  show.append(17,()=>assert.fail('Landed drones must not render'));
  assert.equal(show.drones.length,0);
});


test('eight distinct animated patterns stay finite, colorful, and spatially bounded',()=>{
  assert.equal(DRONE_PATTERNS.length,8);assert.equal(new Set(DRONE_PATTERNS.map(p=>p.id)).size,8);
  for(const pattern of DRONE_PATTERNS) {
    let motion=0;
    for(let i=0;i<960;i+=13){
      const a=dronePattern(pattern.id,i,960,6),b=dronePattern(pattern.id,i,960,8);
      assert.ok(a.position.every(v=>Number.isFinite(v)&&Math.abs(v)<2));
      motion+=Math.hypot(...a.position.map((v,k)=>v-b.position[k]));
      const color=droneColor(a.hue);assert.ok(color.every(v=>v>=0&&v<=1));assert.ok(Math.max(...color)-Math.min(...color)>.7);
    }
    assert.ok(motion>.1,pattern.id+' should animate');
  }
});

test('the default fleet cycles continuously without position or color jumps',()=>{
  const show=new DroneShow();show.startShow(0,{pos:[0,1.55,0],f:[0,0,-1]},1.4,.625);
  assert.equal(show.patterns.length,8);assert.equal(show.drones.length,960);
  for(let stage=1;stage<=9;stage++)for(const drone of show.drones.filter((_,i)=>i%71===0)) {
    const time=stage*show.stageDuration,a=show.pose(drone,time-.001),b=show.pose(drone,time+.001);
    assert.ok(Math.hypot(...a.position.map((v,k)=>v-b.position[k]))<.1);
    assert.ok(Math.hypot(...a.color.map((v,k)=>v-b.color[k]))<.01);
  }
  assert.equal(show.phase(8*show.stageDuration+7).id,'sphere');
  assert.equal(show.active(1000),true);
});

test('a non-repeating show lands and a personal message leads the sequence',()=>{
  const show=new DroneShow(),basis={pos:[0,1.55,0],f:[0,0,-1]};
  show.startShow(0,basis,.46,.625,{loop:false,pace:'brisk',palette:'aurora'});
  assert.equal(show.landAt,8*12);assert.equal(show.active(103),false);
  const formation={text:'花',width:50,height:50,step:3,points:[{x:0,y:0,color:[1,0,0]}]};
  show.form(formation,110,basis,.46,.625,{loop:true});
  assert.equal(show.patterns.length,12);assert.equal(show.phase(117).id,'message');
  assert.equal(show.phase(110+16+7).id,'sphere');
  assert.deepEqual(show.target('message',0,1).color,[1,0,0]);
});


test('personal messages recur every third formation across loops while all eight shapes progress',()=>{
  const show=new DroneShow(),basis={pos:[0,1.55,0],f:[0,0,-1]};
  const formation={text:'夏 ✨',width:50,height:50,points:[{x:0,y:0,color:[1,0,0]}]};
  show.startShow(0,basis,1.4,.625,{loop:true},formation,3);
  const shapes=[];
  for(let stage=0;stage<36;stage++){
    const time=stage*show.stageDuration,phase=show.phase(time+1);
    assert.equal(phase.id==='message',stage%3===0);
    assert.ok(show.status(time+1).length>0);
    if(phase.id!=='message')shapes.push(phase.id);
    if(stage)for(const drone of show.drones.filter((_,i)=>i%71===0)){
      const a=show.pose(drone,time-.001),b=show.pose(drone,time+.001);
      assert.ok(Math.hypot(...a.position.map((v,k)=>v-b.position[k]))<.1);
      assert.ok(Math.hypot(...a.color.map((v,k)=>v-b.color[k]))<.01);
    }
  }
  const cycle=['helix','heart','saturn','flower','ufo','sphere','bird','cube'];
  assert.deepEqual(shapes,[...cycle,...cycle,...cycle]);
  show.startShow(0,basis,1.4,.625,{loop:false},formation);
  assert.equal(show.landAt,12*16);
  assert.equal(show.active(show.landAt+6),false);
});
