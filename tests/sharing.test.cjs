const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hanabiShareURL,hanabiSharedShow}=require('../experience.js');
test('share links round-trip Japanese, emoji, line breaks and literal URL characters',()=>{
  const message='ジェラ♡杏里\n👨‍👩‍👧‍👦 🌸 # & ? + %0A 100%';
  const link=hanabiShareURL('https://kai-denrei.github.io/hanabi-hansha/?day=1&t=5#old',message);
  assert.ok(link.includes('%0A'));assert.ok(link.includes('%250A'));
  const url=new URL(link);assert.equal(url.pathname,'/hanabi-hansha/');assert.equal(url.search,'?auto');
  assert.deepEqual(hanabiSharedShow(link),{autoplay:true,message,error:''});
});
test('handwritten links accept Unicode and encoded newlines without decoding twice',()=>{
  assert.equal(hanabiSharedShow('https://example.com/?auto#ジェラ%0A♡杏里').message,'ジェラ\n♡杏里');
  assert.equal(hanabiSharedShow('https://example.com/#hello').autoplay,false);
  assert.equal(hanabiSharedShow('https://example.com/?auto').autoplay,true);
  const bad=hanabiSharedShow('https://example.com/?auto#%E0%A4');assert.equal(bad.autoplay,false);assert.ok(bad.error);
  assert.equal(hanabiSharedShow(hanabiShareURL('https://example.com/','a\r\nb\rc')).message,'a\nb\nc');
});
