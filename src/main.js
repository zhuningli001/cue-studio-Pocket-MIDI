import './style.css';
import './devices.css';
import './skins.css';
import './groove.css';
import { initAppearance } from './appearance.js';

const device = new URLSearchParams(location.search).get('device');
if (device === 'pc' || device === 'mob') {
  import('./instrument.js').then(initAppearance).catch((error) => {console.error(error);document.querySelector('#app').textContent='加载暂未完成，请刷新重试。';});
} else {
  document.body.classList.add('entry-page');
  document.querySelector('#app').innerHTML = `
    <header><a class="wordmark" href="/">cue<span> / </span>studio</a><span class="edition">A SMALL SPACE FOR SOUND</span><span class="entry-tag">INTERACTION LAB / 001</span></header>
    <main class="entry-main">
      <div class="entry-heading"><div class="eyebrow">CHOOSE YOUR WAY TO PLAY</div><h1>音乐，从你的<br><em>指尖</em>开始。</h1><p>同一台小乐器，两种演奏方式。<br>选择你手边的设备，开始一场声音实验。</p></div>
      <div class="device-choices">
        <a class="device-card pc-card" href="?device=pc"><div class="card-top"><span>01 / DESKTOP</span><span>↗</span></div><div class="device-preview mini-pc" aria-hidden="true"><div class="mini-screen"></div><div class="mini-knobs"><i></i><i></i><i></i></div><div class="mini-keys">${Array.from({length:20},()=>'<i></i>').join('')}</div></div><div class="device-card-title"><h2>PC</h2><span>桌面工作台</span></div><p>敲击实体键盘，双手演奏。<br>完整控制台，让旋钮和旋律一起流动。</p><div class="device-card-bottom"><span>键盘快捷键 · 鼠标控制</span><b>进入 PC →</b></div></a>
        <a class="device-card mob-card" href="?device=mob"><div class="card-top"><span>02 / MOBILE</span><span>↗</span></div><div class="device-preview mini-mob" aria-hidden="true"><div class="mini-phone"><div class="phone-speaker"></div><div class="mini-screen"></div><div class="mini-pads">${Array.from({length:12},()=>'<i></i>').join('')}</div><div class="phone-home"></div></div><div class="touch-rings"><i></i><i></i><i></i></div></div><div class="device-card-title"><h2>MOB</h2><span>口袋乐器</span></div><p>轻触打击垫，滑过玻璃。<br>也可以调起手机键盘，把打字变成节奏。</p><div class="device-card-bottom"><span>多指触控 · 系统键盘</span><b>进入 MOB →</b></div></a>
      </div><div class="entry-foot"><span>挑一种颜色，装一点不一样的声音。</span><span>CUELUME × WEB AUDIO</span></div>
    </main>`;
  initAppearance();
}
