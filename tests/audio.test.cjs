const {test}=require('node:test');
const assert=require('node:assert/strict');
const {BeachAudio}=require('../audio.js');

test('the boom follows the visible burst by its actual source-to-listener travel time',()=>{
  const audio=new BeachAudio(),calls=[];
  audio.context={state:'running',currentTime:10};audio.lift=(...args)=>calls.push(['lift',...args]);audio.boom=(...args)=>calls.push(['boom',...args]);
  const shell={start:[0,0,-300],target:[0,120,-300],burst:4,size:1.85,seed:42,type:'Willow'};
  audio.launch(shell,1,[0,1.55,0]);
  assert.equal(calls[0][0],'lift');assert.equal(calls[1][0],'boom');
  assert.ok(Math.abs(calls[1][2]-calls[0][2]-(3+Math.hypot(120-1.55,300)/343))<1e-9);
  assert.equal(calls[1][3],1.85);
  audio.context.state='suspended';audio.launch(shell,1,[0,0,0]);assert.equal(calls.length,2);
});

test('cancelling stops pending sources and releases the voice budget',()=>{
  const audio=new BeachAudio();let stopped=0;
  for(let i=0;i<5;i++)audio.voices.add({stop(){stopped++;}});
  audio.cancel();assert.equal(stopped,5);assert.equal(audio.voices.size,0);
});
