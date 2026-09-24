const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FireworkWorld,sparkPosition,FIREWORK_TYPES,fireworkSize,FireworkSequence,createShowPlan}=require('../fireworks.js');

test('every preset replays deterministically and produces finite, bounded motion',()=>{
  for(const type of FIREWORK_TYPES) {
    const a=new FireworkWorld().launch(type,[10,120,-300],2,89);
    const b=new FireworkWorld().launch(type,[10,120,-300],2,89);
    assert.deepEqual(a,b);
    assert.ok(a.burst>a.time);
    for(const spark of a.sparks) {
      assert.deepEqual(sparkPosition(spark,0),spark.origin);
      for(const age of [0,.5,spark.life]) {
        const position=sparkPosition(spark,age);
        assert.ok(position.every(Number.isFinite));
        assert.ok(Math.hypot(...position)<1000);
      }
    }
  }
});

test('launch pool refuses excess shells and recovers after expiry',()=>{
  const world=new FireworkWorld();
  for(let i=0;i<world.limit;i++) assert.ok(world.launch('Willow',[0,120,-300],0));
  assert.equal(world.launch('Ring',[0,120,-300],0),null);
  world.update(20); assert.equal(world.shells.length,0);
  assert.ok(world.launch('Peony',[0,120,-300],20));
});

test('gold willow embers eventually descend under gravity',()=>{
  const shell=new FireworkWorld().launch('Willow',[0,120,-300],0,42);
  const upward=shell.sparks.filter(p=>p.velocity[1]>0);
  assert.ok(upward.length>0);
  for(const p of upward) assert.ok(sparkPosition(p,12)[1]<sparkPosition(p,6)[1]);
});

test('holding increases radius and lifetime, with a capped charge',()=>{
  assert.equal(fireworkSize(0),fireworkSize(.1));
  assert.ok(fireworkSize(2)>fireworkSize(.1)*2);
  assert.equal(fireworkSize(2),fireworkSize(30));
  const small=new FireworkWorld().launch('Willow',[0,120,-300],0,42,fireworkSize(.1));
  const large=new FireworkWorld().launch('Willow',[0,120,-300],0,42,fireworkSize(2));
  assert.ok(large.sparks.length>small.sparks.length);
  assert.ok(Math.hypot(...large.sparks[0].velocity)>Math.hypot(...small.sparks[0].velocity)*2);
  assert.ok(large.end>small.end);
  const world=new FireworkWorld();world.shells.push(large);world.update(large.end-.001);assert.equal(world.shells.length,1);
  world.update(large.end);assert.equal(world.shells.length,0);
});

test('each automatic show balances all effects and completes its finale without rejected shells',()=>{
  for(const preset of ['gold','festival','quiet']) {
    const plan=createShowPlan(preset),sequence=new FireworkSequence(preset,0),world=new FireworkWorld();
    assert.deepEqual(plan,createShowPlan(preset));
    assert.deepEqual(new Set(plan.events.map(e=>e.type)),new Set(FIREWORK_TYPES));
    const finale=plan.events.filter(e=>e.at>=plan.finaleAt),opening=plan.events.filter(e=>e.at<plan.finaleAt);
    assert.ok(finale.length/16>opening.length/plan.finaleAt);
    assert.equal(plan.events.at(-1).type,'Willow');assert.equal(plan.events.at(-1).size,1.85);
    let emitted=0;
    for(let time=0;time<plan.duration+1;time+=.05){
      world.update(time);sequence.update(time,(event,at)=>{emitted++;assert.ok(world.launch(event.type,[event.x*100,event.height,-330],at,event.seed,event.size));});
    }
    assert.equal(emitted,plan.events.length);assert.equal(sequence.done,true);
    sequence.update(plan.duration+1,()=>assert.fail('Finished show emitted again'));
  }
});

test('a stalled show does not release a backlog of missed launches',()=>{
  const sequence=new FireworkSequence('gold',0),emitted=[];
  sequence.update(30,event=>emitted.push(event));assert.ok(emitted.every(event=>30-event.at<.8));
});
