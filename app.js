(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const audio = $('audioPlayer');
  let supabase = null;
  const tracks = [];
  const photos = [];
  let currentIndex = -1;
  const cfg = window.NEURA_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('TU-PROYECTO') && !cfg.supabaseAnonKey.includes('TU_CLAVE');
  if (configured && window.supabase?.createClient) {
    supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    $('connectionState').textContent = 'SUPABASE CONFIGURADO';
    $('connectionState').style.color = '#55d9d0';
  }
  const fmt = n => { if (!Number.isFinite(n)) return '0:00'; const m=Math.floor(n/60),s=Math.floor(n%60); return `${m}:${String(s).padStart(2,'0')}`; };
  const safe = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderTracks() {
    const query=$('searchTracks').value.trim().toLowerCase(), genre=$('genreFilter').value;
    const filtered=tracks.filter(t=>(!query||`${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(query))&&(!genre||t.genre===genre));
    $('trackCount').textContent=`${String(tracks.length).padStart(2,'0')} TEMAS`; const telemetry=$('telemetryTracks'); if(telemetry) telemetry.innerHTML=`${String(tracks.length).padStart(2,'0')} <em>TRK</em>`;
    $('libraryCount').textContent=`${tracks.length+photos.length} ARCHIVOS`;
    $('trackList').innerHTML=filtered.length?filtered.map(t=>`<div class="track-row ${tracks[currentIndex]?.id===t.id?'selected':''}" data-id="${safe(t.id)}"><span class="track-play">▶</span><div><b>${safe(t.title)}</b><small>${safe(t.artist)} · ${safe(t.genre)}</small></div><span class="genre">${t.global?'GLOBAL':'LOCAL'}</span></div>`).join(''):'<div class="empty-state">NO SE ENCONTRARON TEMAS<small>PRUEBA OTRA BÚSQUEDA O SUBE UNA PISTA</small></div>';
  }
  function setPlaying(index, autoplay=true) {
    if(index<0||index>=tracks.length)return; currentIndex=index; const t=tracks[index];
    audio.src=t.url; $('playerTitle').textContent=t.title; $('playerArtist').textContent=t.artist; $('trackTitleInput').value=t.title; $('miniCover').src=t.cover||'assets/predator-cover.jpg';
    if(autoplay) audio.play().then(()=>{$('playPause').textContent='Ⅱ';}).catch(()=>{$('playPause').textContent='▶';});
    renderTracks();
  }
  $('trackList').addEventListener('click',e=>{const row=e.target.closest('.track-row');if(!row)return;const idx=tracks.findIndex(t=>t.id===row.dataset.id);setPlaying(idx);});
  $('searchTracks').addEventListener('input',renderTracks); $('genreFilter').addEventListener('change',renderTracks);
  $('trackForm').addEventListener('submit',async e=>{
    e.preventDefault(); const file=$('audioInput').files[0]; if(!file)return;
    if(file.size>20*1024*1024){$('trackStatus').textContent='El archivo supera 20 MB. Elige una pista más ligera.';return;}
    if(!file.type.startsWith('audio/')&&!/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)){$('trackStatus').textContent='Formato de audio no reconocido.';return;}
    const title=$('trackTitleInput').value.trim(),artist=$('artistInput').value.trim(),genre=$('trackGenre').value,description=$('trackDescription').value.trim();
    $('trackStatus').textContent='Preparando archivo…';
    const localUrl=URL.createObjectURL(file); const track={id:`local-${Date.now()}-${Math.random().toString(16).slice(2)}`,title,artist,genre,description,url:localUrl,file,global:false};
    if(supabase){
      try{
        const ext=(file.name.split('.').pop()||'mp3').toLowerCase(),path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const {error:upErr}=await supabase.storage.from(cfg.audioBucket||'community-audio').upload(path,file,{contentType:file.type||'audio/mpeg',upsert:false}); if(upErr)throw upErr;
        const {data:pub}=supabase.storage.from(cfg.audioBucket||'community-audio').getPublicUrl(path);
        const {error:dbErr}=await supabase.from('tracks').insert({artist,title,genre,description,audio_path:path,audio_url:pub.publicUrl,status:'pending'}); if(dbErr)throw dbErr;
        track.global=true; $('trackStatus').textContent='Tema enviado a Supabase para revisión. Queda pendiente de aprobación antes de publicarse globalmente.';
      }catch(err){console.error(err);$('trackStatus').textContent='Guardado solo en este dispositivo; Supabase devolvió un error: '+(err.message||'revisa configuración y políticas.');}
    } else {$('trackStatus').textContent='Tema cargado en esta sesión. Para publicarlo globalmente conectaremos Supabase en el siguiente paso.';}
    tracks.unshift(track); setPlaying(0,false); audio.src=track.url; renderTracks(); $('trackForm').reset();
  });
  $('photoInput').addEventListener('change',()=>{const file=$('photoInput').files[0]; if(!file)return; const url=URL.createObjectURL(file);$('photoPreview').style.backgroundImage=`url("${url}")`;$('photoPreview').textContent='';});
  $('photoForm').addEventListener('submit',async e=>{
    e.preventDefault();const file=$('photoInput').files[0];if(!file)return;if(file.size>5*1024*1024){$('photoStatus').textContent='La imagen supera 5 MB.';return;}
    if(!file.type.startsWith('image/')){$('photoStatus').textContent='Selecciona un archivo de imagen válido.';return;}
    const title=$('photoTitle').value.trim(),artist=$('photoArtist').value.trim();$('photoStatus').textContent='Añadiendo imagen…';let url=URL.createObjectURL(file);let global=false;
    if(supabase){try{const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from(cfg.imageBucket||'community-images').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;url=supabase.storage.from(cfg.imageBucket||'community-images').getPublicUrl(path).data.publicUrl;global=true;$('photoStatus').textContent='Imagen subida a Supabase Storage.';}catch(err){console.error(err);$('photoStatus').textContent='Imagen añadida solo localmente; error de Supabase: '+(err.message||'revisa el bucket y sus políticas.');}}
    else $('photoStatus').textContent='Imagen añadida a la galería de esta sesión. La subida global se activa al conectar Supabase.';
    photos.unshift({id:`photo-${Date.now()}`,title,artist,url,global});renderPhotos();$('photoForm').reset();$('photoPreview').style.backgroundImage='';$('photoPreview').textContent='VISTA PREVIA DE PORTADA';
  });
  function renderPhotos(){ $('libraryCount').textContent=`${tracks.length+photos.length} ARCHIVOS`; $('photoGallery').innerHTML=photos.length?photos.map(p=>`<article class="photo-card"><img src="${safe(p.url)}" alt="${safe(p.title)}"><div><b>${safe(p.title)}</b><small>${safe(p.artist||'Artista independiente')} · ${p.global?'SUPABASE':'LOCAL'}</small></div><button type="button" data-photo="${safe(p.id)}">USAR COMO PORTADA ACTUAL</button></article>`).join(''):'<div class="empty-state">TU GALERÍA ESTÁ VACÍA<small>SUBE UNA PORTADA PARA EMPEZAR</small></div>'; }
  $('photoGallery').addEventListener('click',e=>{const b=e.target.closest('[data-photo]');if(!b)return;const p=photos.find(x=>x.id===b.dataset.photo);if(p)$('miniCover').src=p.url;});
  $('playPause').addEventListener('click',()=>{if(!audio.src){if(tracks.length)setPlaying(0);return;}if(audio.paused)audio.play().then(()=>$('playPause').textContent='Ⅱ').catch(()=>{});else{audio.pause();$('playPause').textContent='▶';}});
  $('prevTrack').addEventListener('click',()=>{if(tracks.length)setPlaying((currentIndex-1+tracks.length)%tracks.length);});$('nextTrack').addEventListener('click',()=>{if(tracks.length)setPlaying((currentIndex+1)%tracks.length);});
  audio.addEventListener('play',()=>$('playPause').textContent='Ⅱ');audio.addEventListener('pause',()=>$('playPause').textContent='▶');audio.addEventListener('loadedmetadata',()=>{$('duration').textContent=fmt(audio.duration);});audio.addEventListener('timeupdate',()=>{$('currentTime').textContent=fmt(audio.currentTime);$('seekBar').value=audio.duration?audio.currentTime/audio.duration*100:0;});audio.addEventListener('ended',()=>{if(tracks.length)setPlaying((currentIndex+1)%tracks.length);});$('seekBar').addEventListener('input',()=>{if(audio.duration)audio.currentTime=audio.duration*Number($('seekBar').value)/100;});$('volume').addEventListener('input',()=>audio.volume=Number($('volume').value));audio.volume=.8;
  $('albumPrev').addEventListener('click',()=>$('albumStrip').scrollBy({left:-300,behavior:'smooth'}));$('albumNext').addEventListener('click',()=>$('albumStrip').scrollBy({left:300,behavior:'smooth'}));$('mobileMenu').addEventListener('click',()=>$('mainNav').classList.toggle('open'));document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',()=>$('mainNav').classList.remove('open')));
  document.querySelectorAll('.side-link,.main-nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.side-link,.main-nav a').forEach(x=>x.classList.remove('active'));document.querySelectorAll(`a[href="${a.getAttribute('href')}"]`).forEach(x=>x.classList.add('active'));}));
  renderTracks();renderPhotos();
})();
