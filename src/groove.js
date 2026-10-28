import * as Tone from 'tone';
import {constrainMidi,midiName,progression,quantizeNote} from './music.js';

// Every instrument is scheduled against one audio transport, including the count-in.
export class GrooveEngine{
 constructor({output,leadOutput,onChange,onBeat,onFinish}){
  this.config={bpm:120,root:0,scale:'pentatonic',pattern:'house',grid:.25,metronome:false};
  this.enabled={drums:true,chords:true,bass:true,melody:true};this.events=[];this.take=[];this.running=false;this.recordSession=false;this.token=0;this.onChange=onChange;this.onBeat=onBeat;this.onFinish=onFinish;
  this.gains=Object.fromEntries(Object.keys(this.enabled).map(key=>[key,new Tone.Gain(1).connect(key==='melody'?leadOutput:output)]));
  this.kick=new Tone.MembraneSynth({pitchDecay:.035,octaves:5,volume:-5,envelope:{attack:.001,decay:.24,sustain:0,release:.05}}).connect(this.gains.drums);
  this.snareFilter=new Tone.Filter(1300,'highpass').connect(this.gains.drums);
  this.snare=new Tone.NoiseSynth({volume:-16,noise:{type:'white'},envelope:{attack:.001,decay:.1,sustain:0,release:.02}}).connect(this.snareFilter);
  this.hatFilter=new Tone.Filter(6500,'highpass').connect(this.gains.drums);
  this.hat=new Tone.NoiseSynth({volume:-25,envelope:{attack:.001,decay:.035,sustain:0,release:.01}}).connect(this.hatFilter);
  this.chords=new Tone.PolySynth({voice:Tone.Synth,maxPolyphony:18,options:{volume:-15,oscillator:{type:'triangle'},envelope:{attack:.04,decay:.4,sustain:.2,release:.4}}}).connect(this.gains.chords);
  this.bass=new Tone.MonoSynth({volume:-8,oscillator:{type:'triangle'},filter:{Q:.6,type:'lowpass',rolloff:-24},envelope:{attack:.005,decay:.12,sustain:.2,release:.12},filterEnvelope:{attack:.001,decay:.2,sustain:.1,release:.1,baseFrequency:100,octaves:2}}).connect(this.gains.bass);
  this.melody=new Tone.PolySynth({voice:Tone.Synth,maxPolyphony:48,options:{oscillator:{type:'sine'},envelope:{attack:.006,decay:.25,sustain:.2,release:.5}}}).connect(this.gains.melody);
  this.click=new Tone.Synth({volume:-19,oscillator:{type:'sine'},envelope:{attack:.001,decay:.025,sustain:0,release:.01}}).connect(output);
 }
 configure(config){Object.assign(this.config,config);Tone.getTransport().bpm.value=this.config.bpm;this.onChange?.();}
 setLead(options){this.melody.set(options);}
 setTrack(track,enabled){this.enabled[track]=enabled;this.gains[track].gain.rampTo(enabled?1:0,.02);this.onChange?.();}
 phase(){
  if(!this.running)return 'idle';
  if(!this.recordSession)return 'playing';
  const beats=(Tone.immediate()-this.origin)*this.sessionBpm/60;
  return beats<4?'countin':beats<20?'recording':'playing';
 }
 start(record=false){
  this.stop();this.token++;this.recordSession=record;this.take=[];this.previous=this.events;this.recordedRoot=this.config.root;
  this.sessionBpm=this.config.bpm;this.origin=Tone.now()+.06;this.running=true;this.counter=0;const token=this.token;
  this.loop=new Tone.Loop(time=>{if(token!==this.token)return;this.tick(time,this.counter++,token);},'16n').start(0);
  Tone.getTransport().start(this.origin);this.onChange?.();
 }
 stop(){
  if(this.recordSession&&this.phase()!=='playing'&&this.previous)this.events=this.previous;
  this.running=false;this.recordSession=false;this.token++;this.loop?.dispose();this.loop=null;
  Tone.getTransport().stop(Tone.immediate());Tone.getTransport().position=0;
  this.chords.releaseAll();this.melody.releaseAll();this.bass.triggerRelease();this.kick.triggerRelease();this.snare.triggerRelease();this.hat.triggerRelease();this.click.triggerRelease();this.onChange?.();
 }
 clear(){this.stop();this.events=[];this.take=[];this.onChange?.();}
 noteOn(midi,velocity){
  if(this.phase()!=='recording')return null;
  const beat=(Tone.immediate()-this.origin)*this.config.bpm/60-4;
  const {tick,durationTicks}=quantizeNote(beat,.25,this.config.grid);
  const event={midi,velocity,tick,durationTicks,rawBeat:beat,root:this.config.root};this.take.push(event);return event;
 }
 noteOff(event){if(!event)return;const end=(Tone.immediate()-this.origin)*this.config.bpm/60-4;event.durationTicks=quantizeNote(event.rawBeat,Math.max(.08,end-event.rawBeat),this.config.grid).durationTicks;}
 tick(time,absolute,token){
  const count=this.recordSession&&absolute<16;
  const step=(absolute-(this.recordSession?16:0)+64)%64;
  if(this.recordSession&&absolute===80){this.events=this.take;Tone.getDraw().schedule(()=>{if(token===this.token){this.onFinish?.();this.onChange?.();}},time);}
  if(count){if(absolute%4===0)this.click.triggerAttackRelease(absolute===0?'C6':'C5',.025,time,.65);}
  else{
   this.backing(time,step);
   if(this.config.metronome&&step%4===0)this.click.triggerAttackRelease(step%16===0?'C6':'C5',.025,time,.4);
   if((!this.recordSession||absolute>=80)&&this.enabled.melody){
    const grouped=new Map();
    for(const event of this.events.filter(e=>e.tick===step)){
     const note=midiName(constrainMidi(event.midi+this.config.root-event.root,this.config.root,this.config.scale));
     const existing=grouped.get(note);if(!existing||event.durationTicks>existing.durationTicks)grouped.set(note,event);
    }
    for(const [note,event]of grouped)this.melody.triggerAttackRelease(note,event.durationTicks/4*60/this.config.bpm,time,event.velocity);
   }
  }
  Tone.getDraw().schedule(()=>{if(token!==this.token)return;this.onBeat?.({step,bar:Math.floor(step/16),beat:Math.floor(step%16/4),count:count?4-Math.floor(absolute/4):0,phase:this.phase()});},time);
 }
 backing(time,step){
  const local=step%16,bar=Math.floor(step/16);const chord=progression(this.config.root,this.config.scale)[bar];
  const pattern=this.config.pattern;
  if(this.enabled.drums){
   const kicks=pattern==='house'?[0,4,8,12]:pattern==='lofi'?[0,6,10]:[0,6,8];
   if(kicks.includes(local))this.kick.triggerAttackRelease('C1',.11,time,local===0?.9:.65);
   if([4,12].includes(local))this.snare.triggerAttackRelease(.06,time,.65);
   if(local%2===0)this.hat.triggerAttackRelease(.025,time,local%4===0?.35:.65);
  }
  if(this.enabled.chords){
   const positions=pattern==='house'?[0,6,10]:[0];
   if(positions.includes(local))this.chords.triggerAttackRelease(chord.notes.map(midiName),(pattern==='house'?.65:3.3)*60/this.config.bpm,time,.55);
  }
  if(this.enabled.bass&&[0,6,8,14].includes(local))this.bass.triggerAttackRelease(midiName(chord.bass+(local===14?12:0)),.6*60/this.config.bpm,time,local===0?.8:.6);
 }
}
