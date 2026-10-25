(() => {
  const audio = document.getElementById("audioPlayer");
  const filesInput = document.getElementById("audioFiles");
  const playlist = document.getElementById("playlist");
  const playBtn = document.getElementById("playBtn");
  const seekBar = document.getElementById("seekBar");
  const volumeBar = document.getElementById("volumeBar");
  const visualizer = document.getElementById("visualizer");
  const albumArt = document.getElementById("albumArt");
  const tracks = [];
  let currentIndex = -1;
  let objectUrls = [];
  const $ = id => document.getElementById(id);

  for (let i = 0; i < 52; i++) {
    const bar = document.createElement("span");
    bar.style.height = `${4 + Math.random() * 12}px`;
    visualizer.appendChild(bar);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function safeTitle(name) {
    return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Archivo desconocido";
  }

  function renderPlaylist() {
    $("trackCount").textContent = `${String(tracks.length).padStart(2, "0")} ARCHIVOS`;
    if (!tracks.length) {
      playlist.innerHTML = '<div class="empty-state"><span>▧</span><strong>NO HAY ARCHIVOS</strong><small>Carga MP3, WAV, OGG o M4A para comenzar.</small></div>';
      return;
    }
    playlist.innerHTML = "";
    tracks.forEach((track, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `track-item${index === currentIndex ? " selected" : ""}`;
      row.style.width = "100%";
      row.style.textAlign = "left";
      row.innerHTML = `<span class="track-thumb">${index === currentIndex && !audio.paused ? "♫" : "N"}</span>
        <span class="track-details"><strong></strong><small></small></span><span class="track-duration">${track.duration || "--:--"}</span>`;
      row.querySelector("strong").textContent = track.title;
      row.querySelector("small").textContent = `NR-${String(index + 1).padStart(3, "0")} // LOCAL`;
      row.addEventListener("click", () => loadTrack(index, true));
      playlist.appendChild(row);
    });
  }

  function updateTelemetry() {
    const playing = !audio.paused && !audio.ended;
    $("signalState").textContent = playing ? "TRANSMITIENDO" : (currentIndex >= 0 ? "ARCHIVO EN PAUSA" : "EN ESPERA");
    $("playState").textContent = playing ? "CHANNEL TRANSMITTING" : "CHANNEL STANDBY";
    $("signalLevel").innerHTML = playing ? `-${Math.round(7 + audio.volume * 24)} <small>dB</small>` : "-- <small>dB</small>";
    $("freq").innerHTML = playing ? `${(80 + audio.currentTime * 3.7).toFixed(1)} <small>Hz</small>` : "000.0 <small>Hz</small>";
    $("meterFill").style.width = playing ? `${Math.max(7, audio.volume * (45 + Math.sin(audio.currentTime * 7) * 20))}%` : "0%";
    visualizer.classList.toggle("active", playing);
    albumArt.classList.toggle("playing", playing);
    playBtn.textContent = playing ? "Ⅱ" : "▶";
    playBtn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  }

  function loadTrack(index, autoplay = false) {
    if (index < 0 || index >= tracks.length) return;
    currentIndex = index;
    const track = tracks[index];
    audio.src = track.url;
    $("trackTitle").textContent = track.title;
    $("trackArtist").textContent = track.artist || "Archivo local recuperado";
    $("trackCode").textContent = `NR-${String(index + 1).padStart(3, "0")}`;
    $("currentTime").textContent = "00:00";
    $("duration").textContent = track.duration || "00:00";
    seekBar.value = 0;
    renderPlaylist();
    updateTelemetry();
    if (autoplay) audio.play().catch(() => {
      $("playState").textContent = "PULSA PLAY PARA INICIAR";
    });
  }

  filesInput.addEventListener("change", () => {
    const selected = Array.from(filesInput.files || []);
    const valid = selected.filter(file => file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name));
    if (!valid.length) {
      alert("Selecciona archivos de audio MP3, WAV, OGG, M4A, AAC o FLAC.");
      filesInput.value = "";
      return;
    }
    valid.forEach(file => {
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      const track = { title: safeTitle(file.name), artist: "Archivo local recuperado", url, duration: "--:--", file };
      tracks.push(track);
      const probe = new Audio();
      probe.preload = "metadata";
      probe.src = url;
      probe.addEventListener("loadedmetadata", () => {
        track.duration = formatTime(probe.duration);
        renderPlaylist();
        if (tracks.indexOf(track) === currentIndex) $("duration").textContent = track.duration;
      }, { once: true });
    });
    renderPlaylist();
    if (currentIndex === -1 && tracks.length) loadTrack(0, false);
    filesInput.value = "";
  });

  playBtn.addEventListener("click", () => {
    if (currentIndex === -1 && tracks.length) loadTrack(0, true);
    else if (currentIndex >= 0) {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    } else {
      filesInput.click();
    }
  });
  $("prevBtn").addEventListener("click", () => {
    if (tracks.length) loadTrack((currentIndex - 1 + tracks.length) % tracks.length, true);
  });
  $("nextBtn").addEventListener("click", () => {
    if (tracks.length) loadTrack((currentIndex + 1) % tracks.length, true);
  });
  audio.addEventListener("timeupdate", () => {
    $("currentTime").textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) seekBar.value = String(audio.currentTime / audio.duration * 1000);
    updateTelemetry();
  });
  audio.addEventListener("loadedmetadata", () => {
    $("duration").textContent = formatTime(audio.duration);
    if (currentIndex >= 0) tracks[currentIndex].duration = formatTime(audio.duration);
    renderPlaylist();
  });
  audio.addEventListener("play", () => { updateTelemetry(); renderPlaylist(); });
  audio.addEventListener("pause", () => { updateTelemetry(); renderPlaylist(); });
  audio.addEventListener("ended", () => {
    if (tracks.length > 1) loadTrack((currentIndex + 1) % tracks.length, true);
    else updateTelemetry();
  });
  seekBar.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration;
  });
  volumeBar.addEventListener("input", () => { audio.volume = Number(volumeBar.value); updateTelemetry(); });
  audio.volume = Number(volumeBar.value);

  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    $("themeToggle").textContent = document.body.classList.contains("light-mode") ? "MODO OSCURO" : "MODO NOCHE";
  });

  window.addEventListener("beforeunload", () => objectUrls.forEach(url => URL.revokeObjectURL(url)));
  renderPlaylist();
  updateTelemetry();
})();
