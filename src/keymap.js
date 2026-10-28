export const cues=['tap','type','select','toggle','open','close','success','error','navigate','warning','loading','ready','attention','count'];
export const rows=['1234567890','QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
export const keys=rows.join('');
const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const notes=Array.from({length:36},(_,i)=>names[i%12]+(3+Math.floor(i/12)));
// Cuelume has 14 cues. Every key has an explicit assignment, shared by both devices.
export const cueMap=[
 'tap','type','select','toggle','open','close','success','error','navigate','warning',
 'tap','type','select','toggle','open','close','success','error','navigate','warning',
 'loading','ready','attention','count','tap','type','select','toggle','open',
 'close','success','error','navigate','warning','ready','attention',
];
