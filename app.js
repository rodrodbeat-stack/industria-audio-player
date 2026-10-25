(() => {
  const audio = document.getElementById('audioPlayer');
  const fileInput = document.getElementById('audioFiles');
  const list = document.getElementById('playlistList');
  const count = document.getElementById('trackCount');
  const playBtn = document.getElementById('playButton');
  const seek = document.getElementById('seekBar');
  const volume = document.getElementById('volumeBar');
  const title = document.getElementById('trackTitle');
  const artist = document.getElementById('trackArtist');
  const album = document.getElementById('trackAlbum');
  const cover = document.getElementById('coverArt');
  const state = document.getElementById('playState');
  const telemetryState = document.getElementById('telemetryState');
  const logPlayback = document.getElementById('logPlayback');
  const audioLight = document.getElementById('audioLight');
  const bars = document.getElementById('visualizer');
  const currentTime = document.getElementById('currentTime');
  const duration = document.getElementById('duration');
  const tracks = [];
  let current = -1, shuffle = false, repeat = false, objectUrl = null;

  // Animated industrial frequency bars (visual decoration; no microphone access).
  for (let i = 0; i < 44; i++) {
    const bar = document.createElement('i');
    bar.className = 'bar';
    bars.appendChild(bar);
  }
  const barNodes = [...bars.children];
  let animation = 0;
  function animateBars() {
    animation++;
    barNodes.forEach((bar, i) => {
      const height = audio.paused ? 4 + ((i * 7) % 9) : 12 + Math.abs(Math.sin(animation * .13 + i * .52)) * 72;
      bar.style.height = `${height}%`;
    });
    if (!audio.paused) {
      document.getElementById('intensity').textContent = `${Math.round(55 + Math.abs(Math.sin(animation / 17)) * 43)}%`;
      document.getElementById('signalMeter').style.width = `${55 + Math.abs(Math.sin(animation / 17)) * 43}%`;
      document.getElementById('signalPercent').textContent = document.getElementById('intensity').textContent;
      document.getElementById('bpm').textContent = `${Math.round(90 + Math.abs(Math.sin(animation / 50)) * 55)}`;
    }
    requestAnimationFrame(animateBars);
  }
  animateBars();

  function fmt(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function updateStatus(playing) {
    const text = playing ? 'REPRODUCIENDO' : (current >= 0 ? 'EN PAUSA' : 'EN ESPERA');
    state.textContent = text;
    telemetryState.textContent = playing ? 'ACTIVO' : 'STANDBY';
    logPlayback.textContent = playing ? 'ACTIVO' : 'PAUSA';
    audioLight.classList.toggle('off', !playing);
    playBtn.textContent = playing ? 'Ⅱ' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    bars.classList.toggle('idle', !playing);
  }
  function renderList() {
    count.textContent = `${String(tracks.length).padStart(2, '0')} TEMAS`;
    document.getElementById('logTracks').textContent = String(tracks.length).padStart(2, '0');
    if (!tracks.length) {
      list.innerHTML = '<div class="empty-state">NO HAY ARCHIVOS CARGADOS<br><small>IMPORTA AUDIO PARA INICIAR LA SEÑAL</small></div>';
      return;
    }
    list.innerHTML = '';
    tracks.forEach((track, index) => {
      const button = document.createElement('button');
      button.className = `track-row${index === current ? ' selected' : ''}`;
      button.type = 'button';
      button.innerHTML = `<span class="track-thumb" style="display:grid;place-items:center;background:linear-gradient(135deg,#182e2c,#17060b);color:#ff263e;font-family:Orbitron,sans-serif">♫</span><span class="track-text"><strong></strong><small>NEURA // ARCHIVO LOCAL</small></span><span class="track-length">${track.duration ? fmt(track.duration) : '--:--'}</span>`;
      button.querySelector('strong').textContent = track.name.replace(/\.[^.]+$/, '');
      button.addEventListener('click', () => loadTrack(index, true));
      list.appendChild(button);
    });
  }
  function loadTrack(index, autoplay) {
    if (index < 0 || index >= tracks.length) return;
    current = index;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(tracks[index].file);
    audio.src = objectUrl;
    title.textContent = tracks[index].name.replace(/\.[^.]+$/, '').toUpperCase();
    artist.textContent = 'NEURA // 888 DIGITAL FACTORY';
    album.textContent = 'ARCHIVO LOCAL';
    cover.src = 'assets/predator-cover.jpg';
    seek.value = 0;
    currentTime.textContent = '00:00';
    duration.textContent = '00:00';
    renderList();
    if (autoplay) audio.play().then(() => updateStatus(true)).catch(() => updateStatus(false));
    else updateStatus(false);
  }
  fileInput.addEventListener('change', () => {
    const files = [...fileInput.files].filter(file => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name));
    if (!files.length) return;
    files.forEach(file => tracks.push({ file, name: file.name, duration: 0 }));
    renderList();
    if (current < 0) loadTrack(0, false);
    fileInput.value = '';
  });
  audio.addEventListener('loadedmetadata', () => {
    if (current >= 0) tracks[current].duration = audio.duration;
    duration.textContent = fmt(audio.duration);
    renderList();
  });
  audio.addEventListener('timeupdate', () => {
    currentTime.textContent = fmt(audio.currentTime);
    duration.textContent = fmt(audio.duration);
    if (Number.isFinite(audio.duration) && audio.duration > 0) seek.value = Math.round(audio.currentTime / audio.duration * 1000);
  });
  audio.addEventListener('play', () => updateStatus(true));
  audio.addEventListener('pause', () => updateStatus(false));
  audio.addEventListener('ended', () => {
    if (repeat) { audio.currentTime = 0; audio.play(); return; }
    nextTrack();
  });
  playBtn.addEventListener('click', () => {
    if (current < 0 && tracks.length) loadTrack(0, true);
    else if (current < 0) { fileInput.click(); }
    else if (audio.paused) audio.play().catch(() => updateStatus(false));
    else audio.pause();
  });
  function nextTrack() {
    if (!tracks.length) return;
    let next = current + 1;
    if (shuffle && tracks.length > 1) {
      do { next = Math.floor(Math.random() * tracks.length); } while (next === current);
    } else if (next >= tracks.length) next = 0;
    loadTrack(next, true);
  }
  function previousTrack() {
    if (!tracks.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    loadTrack((current - 1 + tracks.length) % tracks.length, true);
  }
  document.getElementById('nextButton').addEventListener('click', nextTrack);
  document.getElementById('previousButton').addEventListener('click', previousTrack);
  document.getElementById('shuffleButton').addEventListener('click', event => {
    shuffle = !shuffle; event.currentTarget.classList.toggle('active', shuffle);
  });
  document.getElementById('repeatButton').addEventListener('click', event => {
    repeat = !repeat; event.currentTarget.classList.toggle('active', repeat);
  });
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
  });
  volume.addEventListener('input', () => audio.volume = Number(volume.value));
  audio.volume = Number(volume.value);
  renderList();
  updateStatus(false);
})();