import * as Tone from 'tone';
import { play, unlock, setVolume, setEnabled } from 'cuelume';
const isMobile = new URLSearchParams(location.search).get('device') === 'mob';
document.body.classList.add(isMobile ? 'mobile-instrument' : 'pc-instrument');

import { rows, keys as letters, cueMap } from './keymap.js';
import { GrooveEngine } from './groove.js';
import { PITCHES, SCALE_LABELS, constrainMidi, midiName, progression } from './music.js';
let theme='default', mode='notes', ready=false, starting=null, groove;
const music={bpm:120,root:0,scale:'pentatonic',pattern:'house',grid:.25,metronome:false};
const noteCounts=new Map();
const playableMidi=i=>constrainMidi(48+i,music.root,music.scale);
const playableNote=i=>midiName(playableMidi(i));
const held=new Map(), pointers=new Map();
let synth, filter, delay, reverb, volume;
const values={tone:48,decay:38,space:28,motion:0};
document.querySelector('#app').innerHTML=`
<header><a class="wordmark" href="/" aria-label="返回设备入口">cue<span> / </span>studio</a><span class="edition">${isMobile ? 'MOB / POCKET INSTRUMENT' : 'PC / DESKTOP INSTRUMENT'}</span><a class="device-back" href="/">切换设备</a><button id="power">开启声音 ↗</button></header>
<main><div class="intro"><div><div class="eyebrow">A LITTLE INSTRUMENT FOR YOUR CURIOSITY</div><h1>${isMobile ? '装进口袋的<br>声音游乐场。' : '把每一次敲击，<br>变成一点音乐。'}</h1></div><p>从一声玻璃轻响开始。<br>弹几个音，拧一下旋钮，留下一段循环。</p></div>
<section class="machine" aria-label="声音工作台"><div class="screw s1"></div><div class="screw s2"></div>
<div class="machine-top"><div><b class="device-name">CUE—01</b><span class="device-sub">${isMobile ? 'POCKET SOUND MACHINE' : 'TACTILE SOUND MACHINE'}</span></div><span class="led" id="status">声音待开启</span></div>
<div class="controls"><div class="bank"><div class="label">01 / MATERIAL <span>声音材质</span></div><div class="themes">${['default','mech','bubble','press'].map((x,i)=>`<button data-theme="${x}" class="${i===0?'selected':''}"><i></i>${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div><p id="material-description">玻璃与木质的清透敲击</p></div>
<div class="screen"><div class="screen-head"><span id="sound-name">READY TO PLAY</span><span id="bpm-display">120 BPM</span></div><canvas id="scope" aria-label="声音波形"></canvas><div class="screen-foot"><span id="screen-mode">C / 大调五声音阶</span><span id="step-count">01 / 04</span></div></div>
<div class="knobs">${[['tone','明暗'],['decay','尾音'],['space','空间'],['motion','回声']].map(([key,label])=>`<label class="knob-wrap"><div class="knob" style="--angle:${values[key]*2.7-135}deg"><i></i><input aria-label="${label}" data-param="${key}" type="range" min="0" max="100" value="${values[key]}"></div><span>${label}</span><output>${values[key]}</output></label>`).join('')}</div></div>
<section class="groove-panel" aria-label="节奏与伴奏"><div class="groove-heading"><div><div class="label">02 / GROOVE STATION</div><h2>给旋律，一个节奏。</h2></div><button id="groove-play">▶ 开启伴奏</button></div><details class="groove-options" ${isMobile?'':'open'}><summary>速度、调性与量化设置 <span id="settings-summary">120 BPM · C</span></summary><div class="groove-settings"><label>速度 BPM<input id="tempo" type="number" min="70" max="150" value="120" inputmode="numeric"></label><label>节奏<select id="pattern"><option value="house">House · 四拍律动</option><option value="lofi">Lo-fi · 慢拍</option><option value="pop">Pop · 轻快</option></select></label><label>调性<select id="root">${PITCHES.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label>音阶约束<select id="scale">${Object.entries(SCALE_LABELS).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label>录音量化<select id="quantize"><option value="0.25">1/16 · 细腻</option><option value="0.5">1/8 · 整齐</option></select></label></div></details><div class="track-strip" role="group" aria-label="伴奏分轨">${[['drums','鼓点','KICK / SNARE / HAT'],['chords','和弦','每小节一个和弦'],['bass','低音','根音与八度'],['melody','录制旋律','等待你的演奏']].map(([id,label,desc])=>`<button data-track="${id}" aria-pressed="true"><i></i><span>${label}<small>${desc}</small></span><b>ON</b></button>`).join('')}</div><div class="progression" aria-label="四小节和弦进行">${progression().map((chord,i)=>`<div data-bar="${i}"><span>0${i+1}</span><b>${chord.label}</b><small>小节</small></div>`).join('')}</div><div class="groove-foot"><span id="take-status" role="status">先开伴奏，再录下 4 小节旋律。</span><button id="metronome" aria-pressed="false">节拍器 OFF</button></div></section><div class="performance-head"><div class="mode-switch"><button data-mode="notes" class="selected">音阶演奏</button><button data-mode="cues">原始提示音</button></div><span id="mode-help">音阶约束已开启 · 按住延音 · 可同时弹奏</span></div>
${isMobile ? `<nav class="mobile-play-tabs" aria-label="演奏方式"><button data-view="pads" class="selected" aria-pressed="true">打击垫</button><button data-view="typing" aria-pressed="false">手机键盘</button><button data-view="glass" aria-pressed="false">玻璃触控</button></nav><section class="typing-panel" hidden><div class="typing-title"><span>TYPE A LITTLE MELODY</span><span id="typed-note">—</span></div><h2>让打字，有声有色。</h2><p>输入字母或数字，每个按键都是一声短音。<br>支持 A–Z / 0–9；重复输入也能敲出节奏。</p><label class="native-input-label" for="native-keys">演奏输入区</label><input id="native-keys" type="text" inputmode="text" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="点这里，输入 hello…" aria-describedby="native-help"><div class="typing-actions"><button id="show-keyboard">调起手机键盘 ↗</button><button id="hide-keyboard">收起键盘</button></div><p id="native-help" class="native-help" role="status">使用英文输入法；每次输入触发短音，长按演奏请使用打击垫。</p><div class="type-history" aria-hidden="true">${Array.from({length:8},()=>'<span>·</span>').join('')}</div></section>` : ''}${isMobile ? `<div class="pad-banks" role="group" aria-label="打击垫音区">${['LOW / C3','MID / C4','HIGH / C5'].map((name,i)=>`<button data-bank="${i}" aria-pressed="${i===0}">${name}</button>`).join('')}</div>` : ''}<div class="play-area" data-view="pads"><div class="keyboard">${rows.map((row,r)=>`<div class="key-row row-${r}">${[...row].map(c=>{const i=letters.indexOf(c);return `<button class="key" data-key="${c}" data-index="${i}" ${isMobile&&i>=12?'hidden':''} aria-label="${isMobile?'打击垫 '+c:c} ${playableNote(i)}"><span>${isMobile ? playableNote(i) : c}</span><small>${isMobile ? 'KEY ' + c : playableNote(i)}</small><em>${String(i+1).padStart(2,'0')}</em></button>`}).join('')}</div>`).join('')}<div class="key-hint">${isMobile ? '多指叠奏 · 按住延音 · 滑过打击垫换音' : '数字 0–9 / 字母 A–Z <span>·</span> 点击或多指触摸 <span>·</span> Esc 停止所有声音'}</div></div>
<div class="glass" id="glass" role="button" tabindex="0" aria-label="玻璃触控板，按下发声，拖动改变音高和明暗"><div class="glass-cross"></div><div class="glass-orb"></div><span>TAP THE GLASS</span><small>左右变音 · 上下变亮</small></div></div>
<div class="transport"><div class="transport-buttons"><button id="panic" aria-label="停止全部声音">■ 停音</button><button id="record"><i class="record-dot"></i>录制循环</button><button id="play" disabled>▶ 循环</button><button id="clear" disabled>清除</button></div><div class="steps">${Array.from({length:16},(_,i)=>`<i data-step="${i}"></i>`).join('')}</div><span id="loop-label">4 小节 / 8 秒</span></div>
<div class="machine-bottom"><span>DESIGNED TO BE PLAYED.</span><span>WEB AUDIO / STEREO OUTPUT</span></div></section>
<footer><span><b>先试试：</b>${isMobile ? '轻触几个打击垫，或切换「手机键盘」输入 hello。' : '按 Q、E、T，再按住 W，慢慢转动「空间」。'}</span><span>Cuelume 原声 + 自研合成音色 · 本地实验</span></footer><p class="notice" id="notice" role="status">先点击「开启伴奏」，再点击录制：倒数四拍后，开始 4 小节演奏。</p></main>`;

async function start(){
 if(ready)return true;
 if(starting)return starting;
 starting=(async()=>{try{await Promise.all([Tone.start(),unlock()]);
 filter=new Tone.Filter(4000,'lowpass'); delay=new Tone.FeedbackDelay('8n',0.22);reverb=new Tone.Reverb({decay:1.6,wet:.15});volume=new Tone.Volume(-12);const limiter=new Tone.Limiter(-2).toDestination();
 synth=new Tone.PolySynth({voice:Tone.Synth,maxPolyphony:48,options:{oscillator:{type:'sine'},envelope:{attack:.006,decay:.22,sustain:.2,release:.5}}});
 synth.chain(filter,delay,reverb,volume,limiter);groove=new GrooveEngine({output:volume,leadOutput:filter,onChange:updateGrooveUI,onBeat:showBeat,onFinish:()=>{releaseAll();notice(groove.events.length?'4 小节旋律已量化，正在和伴奏一起循环。':'没有录到音符，伴奏继续播放；可以再次录制。');}});groove.configure(music);ready=true;setVolume(.45);apply();document.querySelector('#power').textContent='● 声音已开启';document.querySelector('#status').textContent='准备就绪';notice(isMobile ? '轻触打击垫，或切换手机键盘输入字母或数字。' : '试着敲击字母键，或点击右侧玻璃。');return true;
 }catch(e){notice('声音未能启动，请再次点击开启声音。');console.error(e);return false;}finally{starting=null;}})();return starting;
}
function notice(t){document.querySelector('#notice').textContent=t;}
function apply(){
 if(!ready)return;
 const options={oscillator:{type:{default:'sine',mech:'triangle',bubble:'sine',press:'sawtooth'}[theme]},envelope:{attack:theme==='bubble'?.018:.006,decay:.12+values.decay/160,sustain:theme==='mech'?.08:.25,release:.08+values.decay/65}};
 synth.set(options);groove?.setLead(options);filter.frequency.rampTo(200*Math.pow(70,values.tone/100),.04);delay.wet.rampTo(values.motion/250,.04);reverb.wet.rampTo(values.space/160,.04);
}
function flash(c,label){document.querySelector(`[data-key="${c}"]`)?.classList.add('down');document.querySelector('#sound-name').textContent=label;pulse=1;}
async function down(c,velocity=.7){
 if(held.has(c)||!letters.includes(c))return;
 const i=letters.indexOf(c),entry={released:false,note:playableNote(i),midi:playableMidi(i)};held.set(c,entry);
 if(!await start()||entry.released){if(held.get(c)===entry)held.delete(c);return;}
 if(mode==='cues'){play(cueMap[i],{theme,volume:.7,key:c.toLowerCase(),input:'keyboard'});flash(c,cueMap[i].toUpperCase());}
 else{entry.sounding=true;const count=noteCounts.get(entry.note)||0;if(!count)synth.triggerAttack(entry.note,Tone.immediate(),velocity);noteCounts.set(entry.note,count+1);flash(c,entry.note+' / '+theme.toUpperCase());entry.event=groove.noteOn(entry.midi,velocity);}
}
function up(c){
 const h=held.get(c);if(!h)return;h.released=true;
 if(h.sounding&&ready){const count=Math.max(0,(noteCounts.get(h.note)||1)-1);if(count)noteCounts.set(h.note,count);else{noteCounts.delete(h.note);synth.triggerRelease(h.note,Tone.immediate());}}
 groove?.noteOff(h.event);held.delete(c);document.querySelector(`[data-key="${c}"]`)?.classList.remove('down');
}
function releaseAll(){[...held.keys()].forEach(up);pointers.clear();noteCounts.clear();document.querySelectorAll('[data-key].down').forEach(el=>el.classList.remove('down'));if(ready)synth.releaseAll();}
document.querySelector('#power').onclick=start;
document.querySelector('#panic').onclick=()=>{stop();notice('全部声音已停止。');};
document.querySelectorAll('[data-key]').forEach(el=>{el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);pointers.set(e.pointerId,el.dataset.key);down(el.dataset.key);};el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();down(el.dataset.key);}};el.onkeyup=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();up(el.dataset.key);}};el.onpointerup=el.onpointercancel=e=>{up(pointers.get(e.pointerId));pointers.delete(e.pointerId);};});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){releaseAll();stop();return;}if(e.target.matches('input,select,textarea')||e.metaKey||e.ctrlKey||e.altKey)return;const c=e.key.toUpperCase();if(c.length===1&&letters.includes(c)&&!e.repeat){e.preventDefault();down(c);}});
window.addEventListener('keyup',e=>up(e.key.toUpperCase()));window.addEventListener('blur',()=>{clearNativeTimers();releaseAll();});document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();stop();}});
document.querySelectorAll('[data-theme]').forEach(el=>el.onclick=()=>{releaseAll();theme=el.dataset.theme;document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('selected',b===el));document.querySelector('#material-description').textContent={default:'玻璃与木质的清透敲击',mech:'干燥、利落的机械触感',bubble:'水滴般圆润，带一点弹性',press:'厚实的按下与轻巧的松开'}[theme];apply();});
document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{stop();mode=el.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===el));refreshNotes();updateGrooveUI();notice(mode==='cues'?'原始提示音自由试听；切回音阶演奏可开启伴奏与录制。':'音阶约束帮助旋律保持和谐，先开伴奏再试着弹几个音。');});
document.querySelectorAll('[data-param]').forEach(input=>{input.oninput=()=>{values[input.dataset.param]=+input.value;input.parentElement.style.setProperty('--angle',`${input.value*2.7-135}deg`);input.closest('label').querySelector('output').textContent=input.value;apply();};input.ondblclick=()=>{input.value={tone:48,decay:38,space:28,motion:0}[input.dataset.param];input.oninput();};});
function stop(){setEnabled(false);setEnabled(true);clearNativeTimers();glassUp();releaseAll();groove?.stop();resetBeat();updateGrooveUI();}
document.querySelector('#record').onclick=async()=>{
 if(!await start()||mode!=='notes')return;
 if(['countin','recording'].includes(groove.phase())){stop();notice('已取消本次录制，保留上一段旋律。');return;}
 clearNativeTimers();releaseAll();glassUp();groove.start(true);notice('倒数 4 拍后开始，录制 4 小节；结束后自动量化并循环。');
};
document.querySelector('#play').onclick=async()=>{if(!await start())return;if(groove.running)stop();else{groove.start();notice('4 小节旋律与伴奏正在同步循环。');}};
document.querySelector('#clear').onclick=()=>{stop();groove?.clear();updateGrooveUI();notice('旋律已清除，伴奏和外观设置保留。');};
document.querySelector('#groove-play').onclick=async()=>{if(!await start()||mode!=='notes')return;if(groove.running)stop();else{groove.start();notice('跟着鼓点自由弹奏，准备好后点击录制。');}};
function refreshNotes(){
 document.querySelectorAll('[data-key]').forEach((el,i)=>{const name=mode==='cues'?cueMap[i]:playableNote(i);el.querySelector('span').textContent=isMobile?name:letters[i];el.querySelector('span').classList.toggle('cue-title',isMobile&&mode==='cues');el.querySelector('small').textContent=isMobile?'KEY '+letters[i]:name;el.setAttribute('aria-label',`${letters[i]} ${name}`);});
 document.querySelector('#mode-help').textContent=mode==='cues'?'Cuelume 原始提示音 · 点击触发':music.scale==='chromatic'?'自由半音阶 · 按住延音':`${PITCHES[music.root]} ${SCALE_LABELS[music.scale]} · 自动约束音高`;
 document.querySelector('#screen-mode').textContent=mode==='cues'?'ORIGINAL CUELUME CUES':`${PITCHES[music.root]} / ${SCALE_LABELS[music.scale]}`;
 progression(music.root,music.scale).forEach((chord,i)=>document.querySelector(`[data-bar="${i}"] b`).textContent=chord.label);
}
function updateGrooveUI(){
 const phase=groove?.phase()||'idle',busy=['countin','recording'].includes(phase),active=groove?.running;
 document.querySelector('#groove-play').textContent=active?'■ 停止伴奏':'▶ 开启伴奏';document.querySelector('#groove-play').disabled=mode==='cues';
 const record=document.querySelector('#record');record.disabled=mode==='cues';record.classList.toggle('active',busy);record.textContent=phase==='countin'?'取消倒数':phase==='recording'?'● 取消录制':groove?.events.length?'● 重新录制':'● 录制 4 小节';
 document.querySelector('#play').textContent=active?'■ 停止':'▶ 循环';document.querySelector('#play').disabled=mode==='cues'||(!active&&!groove?.events.length);
 document.querySelector('#clear').disabled=!groove?.events.length||busy;
 for(const id of ['tempo','pattern','root','scale','quantize'])document.querySelector('#'+id).disabled=busy||mode==='cues';
 document.querySelectorAll('[data-track]').forEach(button=>{const enabled=groove?.enabled[button.dataset.track]??true;button.setAttribute('aria-pressed',String(enabled));button.querySelector('b').textContent=enabled?'ON':'OFF';button.disabled=mode==='cues';});
 document.querySelector('[data-track="melody"] small').textContent=groove?.events.length?`${groove.events.length} 个音符 · 已量化`:'等待你的演奏';
 document.querySelector('#loop-label').textContent=`4 小节 / ${(16*60/music.bpm).toFixed(1)} 秒`;
 document.querySelector('#bpm-display').textContent=music.bpm+' BPM';document.querySelector('#settings-summary').textContent=music.bpm+' BPM · '+PITCHES[music.root];
 document.querySelector('#take-status').textContent=phase==='countin'?'准备演奏 · 听四拍倒数':phase==='recording'?'正在录制 · 结束后自动量化':active?'4 小节循环 · 分轨按钮可随时静音':groove?.events.length?'旋律已保留 · 点击循环继续':'先开伴奏，再录下 4 小节旋律。';
}
function resetBeat(){document.querySelectorAll('[data-step],[data-bar]').forEach(el=>el.classList.remove('lit'));document.querySelector('#step-count').textContent='01 / 04';}
function showBeat({step,bar,beat,count,phase}){
 document.querySelectorAll('[data-step]').forEach((el,i)=>el.classList.toggle('lit',i===step%16));document.querySelectorAll('[data-bar]').forEach((el,i)=>el.classList.toggle('lit',!count&&bar===i));
 document.querySelector('#step-count').textContent=count?`倒数 ${count}`:`${String(bar+1).padStart(2,'0')} / 04`;
 if(count)document.querySelector('#take-status').textContent=`倒数 ${count} · 下一小节开始录制`;
 else if(phase==='recording')document.querySelector('#take-status').textContent=`正在录制 · 第 ${bar+1} / 4 小节 · 第 ${beat+1} 拍`;
 else document.querySelector('#take-status').textContent=`循环播放 · 第 ${bar+1} / 4 小节`;
 updateGrooveControlsOnBeat(phase);
}
let previousPhase='idle';
function updateGrooveControlsOnBeat(phase){if(phase!==previousPhase){previousPhase=phase;updateGrooveUI();}}
for(const [id,key]of [['tempo','bpm'],['root','root'],['scale','scale'],['pattern','pattern'],['quantize','grid']])document.querySelector('#'+id).onchange=e=>{
 if(['countin','recording'].includes(groove?.phase()))return;
 if(key==='bpm'){const value=Number(e.target.value);music.bpm=Number.isFinite(value)?Math.max(70,Math.min(150,Math.round(value))):120;e.target.value=music.bpm;}
 else music[key]=['root','grid'].includes(key)?Number(e.target.value):e.target.value;
 if(key==='pattern'){music.bpm={house:120,lofi:88,pop:108}[music.pattern];document.querySelector('#tempo').value=music.bpm;}
 if(key==='scale'||key==='root'){releaseAll();glassUp();}
 groove?.configure(music);refreshNotes();updateGrooveUI();
};
document.querySelectorAll('[data-track]').forEach(button=>button.onclick=async()=>{if(!await start())return;const track=button.dataset.track;groove.setTrack(track,!groove.enabled[track]);});
document.querySelector('#metronome').onclick=()=>{music.metronome=!music.metronome;groove?.configure(music);document.querySelector('#metronome').setAttribute('aria-pressed',String(music.metronome));document.querySelector('#metronome').textContent='节拍器 '+(music.metronome?'ON':'OFF');};
const glass=document.querySelector('#glass');let glassNote=null,glassToken=0,glassEvent=null;
function glassPosition(e){const r=glass.getBoundingClientRect();const x=Math.max(0,Math.min(.999,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));glass.style.setProperty('--x',`${x*100}%`);glass.style.setProperty('--y',`${y*100}%`);const n=playableNote(12+Math.floor(x*12));if(n!==glassNote){if(glassNote){synth.triggerRelease(glassNote);groove?.noteOff(glassEvent);}glassNote=n;synth.triggerAttack(n,Tone.immediate(),.45);glassEvent=mode==='notes'?groove?.noteOn(playableMidi(12+Math.floor(x*12)),.45):null;}filter.frequency.rampTo(350*Math.pow(30,1-y),.03);pulse=1;document.querySelector('#sound-name').textContent=n+' / GLASS';}
glass.onpointerdown=async e=>{e.preventDefault();const token=++glassToken;glass.setPointerCapture(e.pointerId);glass.classList.add('touching');if(await start()&&token===glassToken)glassPosition(e);};glass.onpointermove=e=>{if(glass.classList.contains('touching')&&ready)glassPosition(e);};
function glassUp(){glassToken++;if(glassNote&&ready)synth.triggerRelease(glassNote);groove?.noteOff(glassEvent);glassEvent=null;glassNote=null;glass.classList.remove('touching');apply();}glass.onpointerup=glass.onpointercancel=glassUp;glass.onlostpointercapture=glassUp;window.addEventListener('blur',glassUp);glass.onkeydown=async e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();await down('Q');glass.classList.add('touching');}};glass.onkeyup=e=>{if(e.key==='Enter'||e.key===' '){up('Q');glass.classList.remove('touching');}};
const canvas=document.querySelector('#scope'),ctx=canvas.getContext('2d');let pulse=0,analyser;
let scopeColors={grid:'#4a4941',wave:'#f0e5c8'};
function updateScopeColors(){const style=getComputedStyle(document.documentElement);scopeColors={grid:style.getPropertyValue('--grid').trim(),wave:style.getPropertyValue('--screen-ink').trim()};}
document.addEventListener('cue:appearance',updateScopeColors);updateScopeColors();
function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==w*2||canvas.height!==h*2){canvas.width=w*2;canvas.height=h*2;}ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,w,h);ctx.strokeStyle=scopeColors.grid;ctx.lineWidth=1;for(let i=0;i<w;i+=16){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}if(ready&&!analyser){analyser=new Tone.Analyser('waveform',256);volume.connect(analyser);}const data=analyser?.getValue();ctx.strokeStyle=scopeColors.wave;ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<w;i++){const v=data?data[Math.floor(i/w*data.length)]:0;const y=h/2+v*h*.9+Math.sin(i*.12)*pulse*8; i?ctx.lineTo(i,y):ctx.moveTo(i,y);}ctx.stroke();pulse*=.94;requestAnimationFrame(draw);}draw();

// The system keyboard produces text edits rather than reliable note-on/note-off events.
const nativeTimers=new Map();
const nativePending=new Set();
let nativeGeneration=0;
function clearNativeTimers(){nativeGeneration++;nativeTimers.forEach(clearTimeout);nativeTimers.clear();nativePending.forEach(clearTimeout);nativePending.clear();}
if(isMobile){
 document.querySelectorAll('[data-bank]').forEach(button=>button.onclick=()=>{
  releaseAll();const bank=Number(button.dataset.bank);
  document.querySelectorAll('[data-bank]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-key]').forEach(el=>{el.hidden=Math.floor(Number(el.dataset.index)/12)!==bank;});
 });
 const input=document.querySelector('#native-keys');
 const panel=document.querySelector('.typing-panel');
 const playArea=document.querySelector('.play-area');
 let lastValue='',composing=false,typedHistory=[];
 async function typeNote(char){
  const c=char.toUpperCase();
  if(!/^[A-Z0-9]$/.test(c))return;
  const key=c;
  const generation=nativeGeneration;
  clearTimeout(nativeTimers.get(key));up(key);
  await down(key,.65);
  if(generation!==nativeGeneration){up(key);return;}
  nativeTimers.set(key,setTimeout(()=>{up(key);nativeTimers.delete(key);},135));
  const i=letters.indexOf(key);
  document.querySelector('#typed-note').textContent=`${c} → ${mode==='cues'?cueMap[i]:playableNote(i)}`;
  typedHistory.push(c);typedHistory=typedHistory.slice(-8);
  document.querySelectorAll('.type-history span').forEach((el,i)=>{el.textContent=typedHistory[i]||'·';el.classList.toggle('struck',i===typedHistory.length-1);});
 }
 function readEdit(){
  const next=input.value;
  if(next===lastValue)return;
  let prefix=0,suffix=0;
  while(prefix<lastValue.length&&prefix<next.length&&lastValue[prefix]===next[prefix])prefix++;
  while(suffix<lastValue.length-prefix&&suffix<next.length-prefix&&lastValue[lastValue.length-1-suffix]===next[next.length-1-suffix])suffix++;
  const inserted=next.slice(prefix,next.length-suffix);lastValue=next;
  const chars=[...inserted].filter(c=>/^[a-z0-9]$/i.test(c));
  chars.slice(-36).forEach((char,i)=>{if(i===0){typeNote(char);return;}const timer=setTimeout(()=>{nativePending.delete(timer);typeNote(char);},i*65);nativePending.add(timer);});
  document.querySelector('#native-help').textContent=chars.length?'正在演奏 · 字母与数字触发短音；连续输入也能敲出节奏。':inserted.trim()?'请切换到英文输入法，输入 A–Z 或数字 0–9 演奏。':'使用英文输入法；空格和删除不发声。';
 }
 input.addEventListener('compositionstart',()=>{composing=true;});
 input.addEventListener('compositionend',()=>{composing=false;readEdit();});
 input.addEventListener('input',e=>{if(!composing&&!e.isComposing)readEdit();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
 input.addEventListener('focus',()=>{document.body.classList.add('native-keyboard-open');});
 input.addEventListener('blur',()=>{document.body.classList.remove('native-keyboard-open');clearNativeTimers();releaseAll();if(input.value.length>1000){input.value='';lastValue='';}});
 document.querySelector('#show-keyboard').onclick=()=>{start();input.focus();input.scrollIntoView({block:'center',behavior:'smooth'});};
 document.querySelector('#hide-keyboard').onclick=()=>input.blur();
 document.querySelectorAll('.mobile-play-tabs button').forEach(button=>button.onclick=()=>{
  clearNativeTimers();releaseAll();glassUp();input.blur();
  const view=button.dataset.view;
  document.querySelectorAll('.mobile-play-tabs button').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
  panel.hidden=view!=='typing';playArea.hidden=view==='typing';playArea.dataset.view=view;document.querySelector('.pad-banks').hidden=view!=='pads';
  if(view==='typing'){start();input.focus();input.scrollIntoView({block:'center',behavior:'smooth'});}
 });
 document.querySelectorAll('[data-key]').forEach(el=>{
  function releasePointer(id){const c=pointers.get(id);pointers.delete(id);if(![...pointers.values()].includes(c))up(c);}
  el.onpointermove=e=>{
   if(!pointers.has(e.pointerId))return;
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-key]');
   const next=target?.dataset.key;
   if(next&&next!==pointers.get(e.pointerId)){releasePointer(e.pointerId);pointers.set(e.pointerId,next);down(next);}
  };
  el.onpointerup=el.onpointercancel=el.onlostpointercapture=e=>releasePointer(e.pointerId);
 });
 document.querySelectorAll('[data-param]').forEach(input=>{
  let drag;
  input.onpointerdown=e=>{e.preventDefault();input.focus({preventScroll:true});input.setPointerCapture(e.pointerId);drag={id:e.pointerId,y:e.clientY,value:+input.value};};
  input.onpointermove=e=>{if(drag?.id!==e.pointerId)return;input.value=Math.max(0,Math.min(100,Math.round(drag.value+(drag.y-e.clientY)/1.5)));input.oninput();};
  input.onpointerup=input.onpointercancel=()=>{drag=null;};
 });
}

refreshNotes();updateGrooveUI();
