import test from 'node:test';
import assert from 'node:assert/strict';
import {SCALES,constrainMidi,quantizeNote,progression,midiName} from '../src/music.js';

test('all roots and constrained scales keep the 36 keys in range and in key',()=>{
 for(let root=0;root<12;root++)for(const [scale,intervals]of Object.entries(SCALES))for(let midi=48;midi<84;midi++){
  const note=constrainMidi(midi,root,scale);assert(note>=48&&note<=83);assert(intervals.includes(((note-root)%12+12)%12));
  if(scale==='chromatic')assert.equal(note,midi);
 }
});
test('sixteenth grid snaps both attack and duration, including bar boundaries',()=>{
 assert.deepEqual(quantizeNote(.36,.37,.25),{tick:1,durationTicks:1});
 assert.deepEqual(quantizeNote(3.98,.49,.25),{tick:16,durationTicks:2});
 assert.deepEqual(quantizeNote(15.99,3,.25),{tick:63,durationTicks:1});
 assert.deepEqual(quantizeNote(-.2,.01,.25),{tick:0,durationTicks:1});
});
test('eighth grid never produces odd ticks or notes extending past four bars',()=>{
 for(let beat=0;beat<16;beat+=.07){const event=quantizeNote(beat,.33,.5);assert.equal(event.tick%2,0);assert.equal(event.durationTicks%2,0);assert(event.tick+event.durationTicks<=64);}
});
test('major and minor accompaniment stay diatonic in all 12 keys',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor'])for(const chord of progression(root,mode)){
  for(const midi of [chord.bass,...chord.notes])assert(SCALES[mode].includes(((midi-root)%12+12)%12));
 }
 assert.deepEqual(progression(0).map(c=>c.label),['C','Am','F','G']);
 assert.deepEqual(progression(9,'minor').map(c=>c.label),['Am','F','C','G']);
 assert.equal(midiName(60),'C4');
});
