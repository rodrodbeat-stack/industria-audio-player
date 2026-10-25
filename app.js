(() => {
const $=id=>document.getElementById(id);
const audio=$("audioPlayer"), input=$("audioFiles"), list=$("playlistList");
const play=$("playButton"), seek=$("seekBar"), current=$("currentTime"), duration=$("duration");
let tracks=[], index=-1, shuffle=false, repeat=false, objectUrls=[];
const fmt=t=>{if(!Number.isFinite(t))return"00:00";let m=Math.floor(t/60),s=Math.floor(t%60);return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")};
function bars(){const box=$("visualizer");for(let i=0;i<54;i++){const b=document.createElement("i");b.style.height=(7+Math.random()*35)+"px";box.appendChild(b)}}
bars();
function animateBars(){document.querySelectorAll(".visualizer i").forEach((b,i)=>{const playing=!audio.paused;const h=playing?(7+Math.random()*(18+Math.abs(Math.sin(Date.now()/260+i))*48)):(4+Math.random()*8);b.style.height=h+"px";b.style.opacity=playing?".95":".42"});requestAnimationFrame(()=>setTimeout(animateBars,130))}
animateBars();
function render(){ $("trackCount").textContent=String(tracks.length).padStart(2,"0")+" TEMAS";$("logTracks").textContent=String(tracks.length).padStart(2,"0");
if(!tracks.length){list.innerHTML='<div class="empty">NO HAY ARCHIVOS EN MEMORIA<br><small>IMPORTA TUS TEMAS PARA ACTIVAR LA TERMINAL</small></div>';return}
list.innerHTML="";tracks.forEach((t,i)=>{const row=document.createElement("div");row.className="track-row"+(i===index?" active":"");row.innerHTML=`<img class="track-thumb" src="assets/predator-cover.jpg" alt=""><div class="track-text"><b>${escapeHtml(t.name.replace(/\.[^.]+$/,""))}</b><small>NEURA // ARCHIVO LOCAL</small></div><time>${t.duration?fmt(t.duration):"--:--"}</time>`;row.addEventListener("click",()=>load(i,true));list.appendChild(row)})}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function load(i,autoplay=false){if(!tracks.length)return;index=(i+tracks.length)%tracks.length;audio.src=tracks[index].url;$("trackTitle").textContent=tracks[index].name.replace(/\.[^.]+$/,"").toUpperCase();$("trackArtist").textContent="NEURA // 888 DIGITAL FACTORY";$("trackAlbum").textContent="DEPREDADOR";$("playState").textContent="CARGANDO";$("telemetryState").textContent="LOADING";render();audio.load();if(autoplay)audio.play().catch(()=>{});}
input.addEventListener("change",()=>{const files=[...input.files].filter(f=>f.type.startsWith("audio/")||/\.(mp3|wav|ogg|m4a|flac)$/i.test(f.name));if(!files.length)return;files.forEach(f=>{const url=URL.createObjectURL(f);objectUrls.push(url);tracks.push({name:f.name,url,duration:0})});render();if(index<0)load(0,false);input.value=""});
play.addEventListener("click",()=>{if(index<0){if(!tracks.length){input.click();return}load(0)}if(audio.paused)audio.play().catch(()=>{$("playState").textContent="ERROR DE AUDIO"});else audio.pause()});
$("previousButton").addEventListener("click",()=>load(index-1,true));$("nextButton").addEventListener("click",()=>load(shuffle?Math.floor(Math.random()*tracks.length):index+1,true));
$("shuffleButton").addEventListener("click",e=>{shuffle=!shuffle;e.currentTarget.classList.toggle("red",shuffle)});$("repeatButton").addEventListener("click",e=>{repeat=!repeat;audio.loop=repeat;e.currentTarget.classList.toggle("red",repeat)});
$("volumeBar").addEventListener("input",e=>audio.volume=Number(e.target.value));audio.volume=.8;
audio.addEventListener("loadedmetadata",()=>{if(index>=0)tracks[index].duration=audio.duration;duration.textContent=fmt(audio.duration);render()});
audio.addEventListener("timeupdate",()=>{current.textContent=fmt(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)seek.value=String(Math.round(audio.currentTime/audio.duration*1000))});
seek.addEventListener("input",()=>{if(audio.duration)audio.currentTime=Number(seek.value)/1000*audio.duration});
audio.addEventListener("play",()=>{play.textContent="Ⅱ";play.setAttribute("aria-label","Pausar");$("playState").textContent="REPRODUCIENDO";$("telemetryState").textContent="ACTIVO";$("logPlayback").textContent="REPRODUCIENDO";$("audioLight").style.background="#27d5b0";$("audioLight").style.boxShadow="0 0 7px #27d5b0";$("intensity").textContent="94%";$("signalMeter").style.width="94%";$("signalPercent").textContent="94%";$("bpm").textContent=String(90+Math.floor(Math.random()*65))});
audio.addEventListener("pause",()=>{play.textContent="▶";play.setAttribute("aria-label","Reproducir");if(audio.ended)return;$("playState").textContent="PAUSADO";$("telemetryState").textContent="STANDBY";$("logPlayback").textContent="PAUSADO";$("audioLight").style.background="var(--red)";$("audioLight").style.boxShadow="0 0 7px var(--red)"});
audio.addEventListener("ended",()=>{if(!repeat&&tracks.length)load(shuffle?Math.floor(Math.random()*tracks.length):index+1,true)});
window.addEventListener("beforeunload",()=>objectUrls.forEach(URL.revokeObjectURL));
})();