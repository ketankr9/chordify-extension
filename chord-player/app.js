// Chord Player App - Free Chordify Clone
// Fetches chords from Chordify and displays them synced with YouTube playback

class ChordPlayer {
  constructor() {
    this.player = null;
    this.chordData = null;
    this.chordEvents = [];
    this.uniqueChords = [];
    this.rafId = null;
    this.lastChordIndex = -1;
    this.lastBeatIndex = -1;
    this.isLoading = false;

    this.initElements();
    this.initYouTubeAPI();
    this.bindEvents();
    this.checkDeepLink();
  }

  initElements() {
    this.urlInput = document.getElementById('youtube-url');
    this.loadBtn = document.getElementById('load-btn');
    this.loadingEl = document.getElementById('loading');
    this.errorEl = document.getElementById('error');
    this.errorMessageEl = document.getElementById('error-message');
    this.playerSection = document.getElementById('player-section');
    this.landingSection = document.getElementById('landing-section');
    this.songTitleEl = document.getElementById('song-title');
    this.chordifyLinkEl = document.getElementById('chordify-link');
    this.currentChordImg = document.getElementById('current-chord-img');
    this.currentChordName = document.getElementById('current-chord-name');
    this.chordTimeline = document.getElementById('chord-timeline');
    this.chordScroll = document.getElementById('chord-scroll');
    this.chordGrid = document.getElementById('chord-grid');
    this.themeSelect = document.getElementById('theme-select');
    this.bookmarkBtn = document.getElementById('bookmark-btn');
    this.bookmarksContainer = document.getElementById('bookmarks-container');
    this.bookmarksList = document.getElementById('bookmarks-list');

    // Set default href for Chordify link
    this.chordifyLinkEl.href = 'https://chordify.net';
  }

  bindEvents() {
    this.loadBtn.addEventListener('click', () => this.loadChords());
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadChords();
    });
    // Horizontal scroll with wheel
    this.chordScroll.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.chordScroll.scrollLeft += e.deltaY;
    });

    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.urlInput.value = btn.dataset.url;
        this.loadChords();
      });
    });

    // Seek on click in timeline
    this.chordTimeline.addEventListener('click', (e) => {
      const beatCell = e.target.closest('.beat-cell');
      if (beatCell && this.player && this.player.seekTo) {
        const time = parseFloat(beatCell.dataset.time);
        this.player.seekTo(time, true);
        this.updateChordDisplay();
      }
    });

    // Theme switching
    this.themeSelect.addEventListener('change', (e) => this.setTheme(e.target.value));

    // Load initial theme
    const savedTheme = localStorage.getItem('chord-player-theme') || 'theme-terminal';
    this.setTheme(savedTheme);

    // Chordify link logic
    this.chordifyLinkEl.addEventListener('click', (e) => {
      const url = this.urlInput.value.trim();
      if (!url) {
        e.preventDefault();
        window.open('https://chordify.net', '_blank');
      }
    });
    // Deep linking support
    window.addEventListener('hashchange', () => this.checkDeepLink());

    // Bookmark button
    this.bookmarkBtn.addEventListener('click', () => this.toggleBookmark());

    // Load initial bookmarks
    this.renderBookmarks();
  }

  checkDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#http')) {
      const url = decodeURIComponent(hash.substring(1));
      this.urlInput.value = url;
      this.loadChords();
    }
  }

  setTheme(themeName) {
    // Remove all theme classes
    const themes = ['theme-modern', 'theme-dark', 'theme-terminal', 'theme-cyberpunk', 'theme-nord'];
    document.body.classList.remove(...themes);

    // Add new theme class
    // if (themeName !== 'theme-terminal') {
    document.body.classList.add(themeName);
    // }

    // Update select value
    this.themeSelect.value = themeName;

    // Persist
    localStorage.setItem('chord-player-theme', themeName);
  }

  findIndexAtTime(list, time) {
    let low = 0;
    let high = list.length - 1;
    let index = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (list[mid].time <= time) {
        index = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return index;
  }

  initYouTubeAPI() {
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API ready');
    };
  }

  extractVideoId(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      } else if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
    } catch (e) {
      // Invalid URL
    }
    return null;
  }

  async loadChords() {
    const url = this.urlInput.value.trim();
    if (!url) return;

    // Guard against multiple concurrent load requests
    if (this.isLoading) return;

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      this.showError('Invalid YouTube URL');
      return;
    }

    // Sync URL hash for browser navigation support
    const currentHashUrl = decodeURIComponent(window.location.hash.substring(1));
    if (currentHashUrl !== url) {
      window.location.hash = url;
      // After setting hash, the 'hashchange' listener in bindEvents() 
      // will trigger another call to loadChords() via checkDeepLink().
      // We return here to prevent this first call from double-loading.
      return;
    }

    // Mark as loading and proceed
    this.isLoading = true;
    this.loadBtn.disabled = true;

    this.showLoading();

    try {
      // Use local proxy server to bypass CORS and Cloudflare
      const proxyUrl = 'http://localhost:5050';
      const chordifyUrl = `https://chordify.net/song/data/youtube:${videoId}?vocabulary=extended_inversions`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        body: chordifyUrl
      });

      if (!response.ok) {
        throw new Error(`Chordify returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.chords || data.chords === 'No chords available') {
        throw new Error('No chords available for this video');
      }

      this.chordData = data;
      this.parseChordData(data);
      this.createYouTubePlayer(videoId, data.url);

      // Update bookmark button state
      this.updateBookmarkButtonState();

    } catch (error) {
      console.error('Error loading chords:', error);
      this.showError(error.message || 'Failed to load chords');
    } finally {
      this.loadBtn.disabled = false;
      this.isLoading = false;
    }
  }

  parseChordData(data) {
    // Parse chord progression with timestamps
    // Format: position;chord_name;start_time;end_time
    const lines = data.chords.split('\n');
    this.chordEvents = [];
    this.beatEvents = []; // For 4-beat measure display
    const chordDict = {};
    let lastChord = null;
    let lastChordTime = 0;

    // First pass: collect unique chord changes AND every beat event
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length >= 4) {
        const time = parseFloat(parts[2]);
        const endTime = parseFloat(parts[3]);
        const chordName = parts[1];
        const beatNumber = parseInt(parts[0]);
        let currentMeasure = this.beatEvents.length > 0 ? this.beatEvents[this.beatEvents.length - 1].measure : 0;

        // If beat number resets to 1, increment measure
        if (beatNumber === 1 && this.beatEvents.length > 0) {
          currentMeasure++;
        }

        // Push to beatEvents - every line in chordify data is a beat
        this.beatEvents.push({
          time: time,
          endTime: endTime,
          chord: chordName,
          beat: beatNumber - 1, // 0-indexed for internal logic (0, 1, 2, 3)
          measure: currentMeasure,
          index: i
        });

        // Push to chordEvents only on change
        if (chordName && chordName !== 'N' && chordName !== lastChord) {
          this.chordEvents.push({
            time: time,
            endTime: endTime,
            chord: chordName,
            index: this.chordEvents.length
          });

          lastChord = chordName;
          lastChordTime = time;

          // Count chord occurrences
          if (!chordDict[chordName]) {
            chordDict[chordName] = 0;
          }
          chordDict[chordName]++;
        } else if (chordName && chordName !== 'N' && chordName === lastChord) {
          // Update end time for same chord
          if (this.chordEvents.length > 0) {
            this.chordEvents[this.chordEvents.length - 1].endTime = endTime;
          }
        }
      }
    }

    // Sort chords by frequency
    this.uniqueChords = Object.entries(chordDict)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Update UI
    this.songTitleEl.textContent = data.title || 'Unknown Song';
    this.chordifyLinkEl.href = data.url || `https://chordify.net/song/data/youtube:${this.extractVideoId(this.urlInput.value.trim())}`;

    this.renderChordTimeline();
    this.renderChordGrid();
    this.renderChordDiagramsList();
  }

  normalizeChordName(chord) {
    // Convert chord names to match image filenames
    let normalized = chord.trim();

    // Remove colon notation (e.g., "Ab:maj" -> "Abmaj")
    normalized = normalized.replace(/:/g, '');

    // Remove extra spaces and clean up
    normalized = normalized.replace(/\s+/g, '');

    // Handle slash chords - take only the base chord
    if (normalized.includes('/')) {
      normalized = normalized.split('/')[0];
    }

    // Handle sharps/flats - convert to filename format
    // A# -> Bb, D# -> Eb, Db -> C#, G# -> Ab, Gb -> F#
    if (normalized === 'A#') normalized = 'Bb';
    if (normalized === 'D#') normalized = 'Eb';
    if (normalized === 'Db') normalized = 'C#';
    if (normalized === 'G#') normalized = 'Ab';
    if (normalized === 'Gb') normalized = 'F#';

    // Replace # with 's' for sharp notation in filenames (e.g., C# -> Cs)
    normalized = normalized.replace(/#/g, 's');

    return normalized;
  }

  getImgName(name) {
    // Use the provided normalization function
    var arr = name.split("/")[0].split(":");
    var chord = this.normalizeChordForImage(arr[0]);

    if (chord[chord.length - 1] == "#")
      chord = chord.slice(0, chord.length - 1) + "s";

    return chord + "_" + arr[1] + ".png";
  }

  normalizeChordForImage(chord) {
    if (chord == "A#") return "Bb";
    if (chord == "D#") return "Eb";
    if (chord == "Db") return "C#";
    if (chord == "G#") return "Ab";
    if (chord == "Gb") return "F#";
    return chord;
  }

  getChordImageUrl(chordName) {
    const filename = this.getImgName(chordName);
    console.log(`Chord: ${chordName} -> ${filename}`);
    return `chords/${filename}`;
  }

  formatChordNameForDisplay(chordName) {
    // Format for display in cells: omit :maj, show :min as m subscript
    const parts = chordName.split(':');
    if (parts.length === 2) {
      const base = parts[0];
      const type = parts[1];
      if (type === 'maj') {
        return { base: base, suffix: '', suffixClass: '' };
      } else if (type === 'min') {
        return { base: base, suffix: 'm', suffixClass: 'chord-suffix-sub' };
      } else {
        return { base: base, suffix: type, suffixClass: 'chord-suffix' };
      }
    }
    return { base: chordName, suffix: '', suffixClass: '' };
  }

  renderChordTimeline() {
    this.chordTimeline.innerHTML = '';

    // Render beat-based timeline (4 beats per measure)
    let lastChord = null;
    let lastMeasure = -1;

    this.beatEvents.forEach((beat, index) => {
      // Add measure separator
      if (beat.measure !== lastMeasure && beat.beat === 0) {
        const separator = document.createElement('div');
        separator.className = 'measure-separator';
        this.chordTimeline.appendChild(separator);
        lastMeasure = beat.measure;
      }

      const beatEl = document.createElement('div');
      beatEl.className = 'beat-cell';
      beatEl.dataset.index = index;
      beatEl.dataset.time = beat.time;

      // Show chord name only on first beat of chord change
      if (beat.chord && beat.chord !== lastChord) {
        beatEl.classList.add('has-chord');

        const formatted = this.formatChordNameForDisplay(beat.chord);
        const chordNameEl = document.createElement('span');
        chordNameEl.className = 'beat-chord-name';
        chordNameEl.innerHTML = formatted.base + (formatted.suffix ? `<sub class="${formatted.suffixClass}">${formatted.suffix}</sub>` : '');
        beatEl.appendChild(chordNameEl);

        lastChord = beat.chord;
      }

      this.chordTimeline.appendChild(beatEl);
    });
  }

  renderChordGrid() {
    this.chordGrid.innerHTML = '';

    // Sort unique chords by frequency (descending)
    const sortedChords = [...this.uniqueChords].sort((a, b) => b.count - a.count);

    sortedChords.forEach(chord => {
      const imgUrl = this.getChordImageUrl(chord.name);

      const itemEl = document.createElement('div');
      itemEl.className = 'chord-grid-item';

      if (imgUrl) {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = chord.name;
        img.title = `${chord.name} (${chord.count}x)`;
        img.onerror = () => {
          img.style.display = 'none';
        };
        itemEl.appendChild(img);
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'chord-grid-name';
      const formatted = this.formatChordNameForDisplay(chord.name);
      nameEl.innerHTML = `${formatted.base}${formatted.suffix ? `<sub class="${formatted.suffixClass}">${formatted.suffix}</sub>` : ''} <span class="chord-count">${chord.count}</span>`;
      nameEl.title = `${chord.count} times in the song`;
      itemEl.appendChild(nameEl);

      this.chordGrid.appendChild(itemEl);
    });
  }

  renderChordDiagramsList() {
    // Render ALL chord events in progression order (including repeats)
    const listEl = document.getElementById('chord-diagrams-list');
    listEl.innerHTML = '';

    this.chordEvents.forEach((event, index) => {
      const imgUrl = this.getChordImageUrl(event.chord);

      const itemEl = document.createElement('div');
      itemEl.className = 'chord-diagram-item';
      itemEl.dataset.chord = event.chord;
      itemEl.dataset.index = index;

      if (imgUrl) {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = event.chord;
        img.onerror = () => {
          img.style.display = 'none';
        };
        itemEl.appendChild(img);
      }

      listEl.appendChild(itemEl);
    });
  }

  highlightCurrentChordDiagramByIndex(index) {
    const items = document.querySelectorAll('.chord-diagram-item');

    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Scroll to show current chord on left side (like beat cells)
    if (index >= 0 && items[index]) {
      const container = document.getElementById('chord-diagrams-scroll');
      const activeItem = items[index];
      const containerWidth = container.clientWidth;
      const itemLeft = activeItem.offsetLeft;

      // Position current chord at 15% from left
      const targetScroll = itemLeft - (containerWidth * 0.15);

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  createYouTubePlayer(videoId, chordifyUrl) {
    this.hideLoading();
    this.playerSection.classList.remove('hidden');
    this.landingSection.classList.add('hidden');

    // Destroy existing player if any
    if (this.player) {
      this.player.destroy();
    }

    // Create new player with fixed height for sidebar
    this.player = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'autoplay': 0,
        'controls': 1,
        'rel': 0
      },
      events: {
        'onReady': (event) => this.onPlayerReady(event),
        'onStateChange': (event) => this.onPlayerStateChange(event)
      }
    });
  }

  onPlayerReady(event) {
    console.log('Player ready');
    this.startChordTracking();
  }

  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      this.startChordTracking();
    } else {
      this.stopChordTracking();
    }
  }

  startChordTracking() {
    this.stopChordTracking(); // Clear any existing animation frame

    const checkChord = () => {
      this.updateChordDisplay();
      this.rafId = requestAnimationFrame(checkChord);
    };

    this.rafId = requestAnimationFrame(checkChord);
  }

  stopChordTracking() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  updateChordDisplay() {
    if (!this.player || !this.player.getCurrentTime) return;

    const currentTime = this.player.getCurrentTime();

    // Use high-precision binary search to find current focus points
    const currentBeatIndex = this.findIndexAtTime(this.beatEvents, currentTime);
    const currentChordIndex = this.findIndexAtTime(this.chordEvents, currentTime);

    // Update if chord changed
    if (currentChordIndex !== this.lastChordIndex && currentChordIndex !== -1) {
      this.lastChordIndex = currentChordIndex;
      this.displayCurrentChord(currentChordIndex);
    }

    // Update if beat changed
    if (currentBeatIndex !== this.lastBeatIndex && currentBeatIndex !== -1) {
      this.lastBeatIndex = currentBeatIndex;

      // Highlight current beat
      this.highlightBeat(currentBeatIndex);

      // Auto-scroll to current beat
      this.scrollToCurrentBeat(currentBeatIndex);
    }
  }

  displayCurrentChord(chordIndex) {
    // Highlight current chord in the diagrams list
    this.highlightCurrentChordDiagramByIndex(chordIndex);
  }

  highlightBeat(beatIndex) {
    const beats = this.chordTimeline.querySelectorAll('.beat-cell');
    beats.forEach((el, index) => {
      if (index === beatIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  scrollToCurrentBeat(beatIndex) {
    const beats = this.chordTimeline.querySelectorAll('.beat-cell');
    if (beats[beatIndex]) {
      const container = this.chordScroll;
      const element = beats[beatIndex];

      const containerWidth = container.clientWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.clientWidth;

      // Position current beat at 20% from left (so more upcoming chords visible)
      const targetScroll = elementLeft - (containerWidth * 0.2);

      // Smooth scroll
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }

  showLoading() {
    this.loadingEl.classList.remove('hidden');
    this.errorEl.classList.add('hidden');
    this.playerSection.classList.add('hidden');
    this.landingSection.classList.add('hidden');
  }

  hideLoading() {
    this.loadingEl.classList.add('hidden');
  }

  showError(message) {
    this.hideLoading();
    this.errorMessageEl.textContent = message;
    this.errorEl.classList.remove('hidden');
    this.playerSection.classList.add('hidden');
    this.landingSection.classList.remove('hidden'); // Show landing again on error
  }

  // --- Bookmarking Methods ---

  getBookmarks() {
    const saved = localStorage.getItem('chord-player-bookmarks');
    return saved ? JSON.parse(saved) : [];
  }

  saveBookmarks(bookmarks) {
    localStorage.setItem('chord-player-bookmarks', JSON.stringify(bookmarks));
    this.renderBookmarks();
  }

  toggleBookmark() {
    if (!this.chordData) return;

    const url = this.urlInput.value.trim();
    const videoId = this.extractVideoId(url);
    if (!videoId) return;

    const bookmarks = this.getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.videoId === videoId);

    if (existingIndex > -1) {
      // Remove it
      bookmarks.splice(existingIndex, 1);
    } else {
      // Add it
      bookmarks.push({
        title: this.chordData.title || 'Unknown Song',
        url: url,
        videoId: videoId
      });
    }

    this.saveBookmarks(bookmarks);
    this.updateBookmarkButtonState();
  }

  updateBookmarkButtonState() {
    const url = this.urlInput.value.trim();
    const videoId = this.extractVideoId(url);
    if (!videoId) return;

    const bookmarks = this.getBookmarks();
    const isSaved = bookmarks.some(b => b.videoId === videoId);

    if (isSaved) {
      this.bookmarkBtn.classList.add('saved');
      this.bookmarkBtn.innerHTML = '✅ Saved';
    } else {
      this.bookmarkBtn.classList.remove('saved');
      this.bookmarkBtn.innerHTML = '🔖 Save';
    }
  }

  renderBookmarks() {
    const bookmarks = this.getBookmarks();

    if (bookmarks.length === 0) {
      this.bookmarksContainer.classList.add('hidden');
      return;
    }

    this.bookmarksContainer.classList.remove('hidden');
    this.bookmarksList.innerHTML = '';

    bookmarks.forEach((bookmark, index) => {
      const container = document.createElement('div');
      container.className = 'bookmark-item-container';

      const btn = document.createElement('button');
      btn.className = 'example-btn';
      btn.textContent = bookmark.title;
      btn.onclick = () => {
        this.urlInput.value = bookmark.url;
        this.loadChords();
      };

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-bookmark-btn';
      removeBtn.innerHTML = '✕';
      removeBtn.title = 'Remove bookmark';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeBookmark(index);
      };

      container.appendChild(btn);
      container.appendChild(removeBtn);
      this.bookmarksList.appendChild(container);
    });
  }

  removeBookmark(index) {
    const bookmarks = this.getBookmarks();
    bookmarks.splice(index, 1);
    this.saveBookmarks(bookmarks);
    this.updateBookmarkButtonState();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chordPlayer = new ChordPlayer();
});
