export const PITCHES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const SCALES={pentatonic:[0,2,4,7,9],major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]};
export const SCALE_LABELS={pentatonic:'大调五声音阶',major:'自然大调',minor:'自然小调',chromatic:'自由半音阶'};
export function midiName(midi){return PITCHES[((midi%12)+12)%12]+(Math.floor(midi/12)-1);}
export function constrainMidi(midi,root=0,scale='pentatonic'){
 const allowed=SCALES[scale]||SCALES.pentatonic;
 for(let distance=0;distance<12;distance++)for(const value of distance?[midi-distance,midi+distance]:[midi])if(value>=48&&value<=83&&allowed.includes(((value-root)%12+12)%12))return value;
 return midi;
}
export function quantizeNote(beat,durationBeats,grid=.25){
 const step=grid===.5?2:1;
 const tick=Math.max(0,Math.min(64-step,Math.round(beat*4/step)*step));
 const durationTicks=Math.max(step,Math.min(64-tick,Math.round(durationBeats*4/step)*step));
 return {tick,durationTicks};
}
export function progression(root=0,scale='pentatonic'){
 const minor=scale==='minor';
 const offsets=minor?[0,8,3,10]:[0,9,5,7];
 const qualities=minor?[true,false,false,false]:[false,true,false,false];
 return offsets.map((offset,i)=>({label:PITCHES[(root+offset)%12]+(qualities[i]?'m':''),bass:36+root+offset,notes:[0,qualities[i]?3:4,7].map(interval=>48+root+offset+interval)}));
}
