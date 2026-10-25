const audio = document.getElementById("audioPlayer");
const playPause = document.getElementById("playPause");
const seek = document.getElementById("seek");
const timeLabel = document.getElementById("timeLabel");
const currentTitle = document.getElementById("currentTitle");
const durationLabel = document.getElementById("durationLabel");
const audioState = document.getElementById("audioState");
const terminalStatus = document.getElementById("terminalStatus");
const sysPlaying = document.getElementById("sysPlaying");
const metricState = document.getElementById("metricState");
const trackList = document.getElementById("trackList");
const audioFiles = document.getElementById("audioFiles");
const importHint = document.getElementById("importHint");

const tracks = [...document.querySelectorAll(".track")].map((el, i) => ({
  title: el.querySelector(".track-meta b").textContent.replace(/^\d+\.\s*/, ""),
  artist: el.querySelector(".track-meta small").textContent,
  duration: el.querySelector("time").textContent,
  src: null, element: el, sample: true
}));
let current = 0, isPlaying = false, shuffle = false, repeat = false, objectUrls = [];

function makeBars(container, count, eq=false) {
  container.innerHTML = "";
  for (let i=0;i<count;i++) {
    const bar=document.createElement("span");
    const h=eq ? 15+Math.random()*85 : 15+Math.abs(Math.sin(i*.55))*70+Math.random()*24;
    bar.style.height=`${Math.min(100,h)}%`;
    container.appendChild(bar);
  }
}
makeBars(document.getElementById("waveform"), 66);
makeBars(document.getElementById("equalizer"), 38, true);
setInterval(()=>{
  document.querySelectorAll("#equalizer span").forEach(b=>b.style.height=`${10+Math.random()*85}%`);
  if(isPlaying) document.getElementById("intensity").textContent=`${65+Math.floor(Math.random()*30)}%`;
},220);

function fmt(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;
}
function setState(playing) {
  isPlaying=playing;
  playPause.textContent=playing ? "Ⅱ" : "▶";
  playPause.setAttribute("aria-label",playing ? "Pausar" : "Reproducir");
  audioState.textContent=playing ? "SEÑAL EN REPRODUCCIÓN" : "SEÑAL EN ESPERA";
  terminalStatus.textContent=playing ? "REPRODUCIENDO..." : "SISTEMA PREPARADO...";
  sysPlaying.textContent=playing ? "●" : "—";
  metricState.textContent=playing ? "ACTIVO" : "STANDBY";
}
function renderTrack() {
  tracks.forEach((t,i)=>t.element.classList.toggle("active",i===current));
  currentTitle.textContent=tracks[current].title;
  durationLabel.textContent=tracks[current].duration;
  document.getElementById("trackCount").textContent=`${tracks.length} TEMAS`;
  if(tracks[current].src) {
    audio.src=tracks[current].src;
    audio.load();
  } else {
    audio.removeAttribute("src");
    audio.load();
  }
  seek.value=0;
  timeLabel.textContent=`00:00 / ${tracks[current].duration}`;
  document.querySelectorAll("#waveform span").forEach((b,i)=>b.classList.toggle("played",i<3));
  setState(false);
}
function selectTrack(index, autoplay=false) {
  current=(index+tracks.length)%tracks.length;
  renderTrack();
  if(autoplay) playCurrent();
}
async function playCurrent() {
  const t=tracks[current];
  if(!t || !t.src) {
    setState(false);
    audioState.textContent="IMPORTA UN ARCHIVO PARA ESCUCHAR";
    terminalStatus.textContent="ESPERANDO ARCHIVO DE AUDIO";
    importHint.textContent="Selecciona uno o más archivos para activar la reproducción.";
    document.querySelector(".import-button").scrollIntoView({behavior:"smooth",block:"nearest"});
    return;
  }
  try { await audio.play(); setState(true); }
  catch(e) { setState(false); audioState.textContent="NO SE PUDO INICIAR EL AUDIO"; }
}
trackList.addEventListener("click", e=>{
  const btn=e.target.closest(".track");
  if(btn) selectTrack(Number(btn.dataset.index), true);
});
playPause.addEventListener("click",()=>{
  if(isPlaying) { audio.pause(); setState(false); }
  else playCurrent();
});
document.getElementById("next").addEventListener("click",()=>selectTrack(shuffle?Math.floor(Math.random()*tracks.length):current+1,true));
document.getElementById("prev").addEventListener("click",()=>{
  if(audio.currentTime>3 && tracks[current].src) audio.currentTime=0;
  else selectTrack(current-1,true);
});
document.getElementById("shuffle").addEventListener("click",e=>{
  shuffle=!shuffle;e.currentTarget.classList.toggle("selected",shuffle);
  e.currentTarget.style.color=shuffle?"var(--red)":"";
  audioState.textContent=shuffle?"MODO ALEATORIO ACTIVADO":"MODO NORMAL";
});
document.getElementById("repeat").addEventListener("click",e=>{
  repeat=!repeat;audio.loop=repeat;e.currentTarget.style.color=repeat?"var(--red)":"";
});
audio.addEventListener("play",()=>setState(true));
audio.addEventListener("pause",()=>setState(false));
audio.addEventListener("loadedmetadata",()=>{
  if(Number.isFinite(audio.duration)) {
    tracks[current].duration=fmt(audio.duration);
    durationLabel.textContent=tracks[current].duration;
    timeLabel.textContent=`${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  }
});
audio.addEventListener("timeupdate",()=>{
  if(!Number.isFinite(audio.duration)||audio.duration<=0)return;
  seek.value=(audio.currentTime/audio.duration)*100;
  timeLabel.textContent=`${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  const n=Math.floor((audio.currentTime/audio.duration)*66);
  document.querySelectorAll("#waveform span").forEach((b,i)=>b.classList.toggle("played",i<n));
});
audio.addEventListener("ended",()=>{if(!repeat)selectTrack(shuffle?Math.floor(Math.random()*tracks.length):current+1,true)});
seek.addEventListener("input",()=>{
  if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(seek.value)/100)*audio.duration;
});
audioFiles.addEventListener("change",()=>{
  const files=[...audioFiles.files].filter(f=>f.type.startsWith("audio/")||/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name));
  if(!files.length){importHint.textContent="No se detectaron archivos de audio compatibles.";return;}
  objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];
  tracks.forEach(t=>t.element.remove());
  tracks.length=0;
  files.forEach((file,i)=>{
    const url=URL.createObjectURL(file);objectUrls.push(url);
    const title=file.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").toUpperCase();
    const el=document.createElement("button");el.className="track";el.dataset.index=i;
    el.innerHTML=`<span class="track-cover cover${(i%12)+1}">♫</span><span class="track-meta"><b>${String(i+1).padStart(2,"0")}. ${escapeHTML(title)}</b><small>ARCHIVO LOCAL</small></span><time>--:--</time>`;
    trackList.appendChild(el);
    tracks.push({title,artist:"ARCHIVO LOCAL",duration:"--:--",src:url,element:el,sample:false});
  });
  importHint.textContent=`${files.length} archivo(s) cargado(s) · audio local en este dispositivo`;
  selectTrack(0,false);
  playCurrent();
});
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
document.querySelectorAll(".nav a").forEach(a=>a.addEventListener("click",()=>{
  document.querySelectorAll(".nav a").forEach(x=>x.classList.remove("active"));a.classList.add("active");
}));
window.addEventListener("beforeunload",()=>objectUrls.forEach(URL.revokeObjectURL));
setState(false);
