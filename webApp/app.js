// app.js — AutoTomb VR (semantic layout, date slider, skybox/camp toggles)
// Update: improved external-page text highlighting (short, alphabetic Text Fragment + single hash)

/* ------------------ Text Fragment helpers for external pages ------------------ */
// Legacy (kept for compatibility with components.js if referenced elsewhere)
function buildTextFragmentCandidates(mention) {
  const clean = s => (s || '')
    .normalize('NFKC')
    .replace(/[“”‘’"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const raw = clean(mention);
  if (!raw) return [];

  const words  = raw.split(' ');
  const prefix = words.slice(0, 2).join(' ');
  const suffix = words.slice(-2).join(' ');
  const short  = raw.length > 80 ? raw.slice(0, 80) : raw;

  const enc = encodeURIComponent;
  return [
    `#:~:text=${enc(prefix)}-,${enc(raw)},-${enc(suffix)}`,
    `#:~:text=${enc(raw)}`,
    `#:~:text=${enc(short)}`
  ];
}

// New: choose ONE best fragment, short & alphabetic to avoid dash/number variance
function buildBestTextFragment(mention) {
  const base = (mention || '').normalize('NFKC')
    .replace(/[“”‘’"']/g, '')
    .replace(/[–—]/g, '-')   // normalize fancy dashes to ASCII
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!base) return '';

  const tokens = base.split(' ');
  const isAlpha = w => /^[a-z]+(?:-[a-z]+)*$/.test(w); // allow hyphenated words

  // Find the longest contiguous run of alphabetic words
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (isAlpha(tokens[i])) {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curStart = -1; curLen = 0;
    }
  }

  let phrase = '';
  if (bestLen >= 4) {
    // Clamp to 12 words max to stay robust
    const take = Math.min(bestLen, 12);
    phrase = tokens.slice(bestStart, bestStart + take).join(' ');
  } else {
    // Fallback: strip non-letters and collapse
    phrase = base.replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!phrase || phrase.length < 6) return '';
    const parts = phrase.split(' ');
    if (parts.length > 12) phrase = parts.slice(0, 12).join(' ');
  }

  return `#:~:text=${encodeURIComponent(phrase)}`;
}

// Ensure we use only one hash/fragment in the URL
function openWithTextFragment(baseUrl, mention) {
  const cleanBase = (baseUrl || '').split('#')[0]; // drop any existing #...
  const frag = buildBestTextFragment(mention);
  const url  = frag ? (cleanBase + frag) : cleanBase;
  console.log('[AutoTomb] Opening with text fragment:', url);
  window.open(url, '_blank', 'noopener');
}

AFRAME.registerComponent('artifact-viewer', {
  init: function () {
    this.artifacts = [];
    this.entities = [];
    this.tombManager = window.tombManager;

    // Caches
    this.tombTitleEl = this.el.sceneEl.querySelector('#tomb-info');
    this.infoEl = this.el.sceneEl.querySelector('#info');

    // UI wiring
    if (window.AutoTomb && typeof window.AutoTomb.attachUI === 'function') {
      window.AutoTomb.attachUI(this);
    }

    // Date filter state
    this.activeDateFilter = null;

    // Cluster params (tunable)
    this.clusterCellSize = 2.0;  // larger voxels so clusters form
    this.minClusterSize  = 2;    // allow pairs

    this.waitForTombManager();
    this.createFlashlight();
  },

  /* --------------------------- Boot / Data --------------------------- */

  async waitForTombManager() {
    console.log('⏳ Waiting for tomb manager...');
    const tm = this.tombManager;
    const ready = () => tm && (typeof tm.isReady === 'function' ? tm.isReady() : tm.config);

    let guard = 0;
    while (!ready() && guard < 600) { await new Promise(r => setTimeout(r, 16)); guard++; }
    if (!ready()) { console.error('Tomb manager did not become ready.'); return; }

    console.log('🚀 Tomb manager ready, starting app...');
    await this.loadArtifacts();
    this.renderArtifacts();
    this._setupDateFilterUI(); // slider always visible
    this.recomputeClusters();  // initial global summary
  },

  async loadArtifacts() {
    const tm = this.tombManager;
    let artifactsURL = './artifacts.web.json';
    try {
      if (tm && tm.config) {
        const curId = tm.config.current_tomb;
        const cur = tm.config.tombs && tm.config.tombs[curId];
        if (cur && cur.artifacts_file) artifactsURL = `./${cur.artifacts_file}`;
      }
    } catch {}

    console.log(`📁 Loading artifacts from: ${artifactsURL}`);

    let raw = [];
    try {
      const res = await fetch(artifactsURL);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      raw = Array.isArray(data) ? data : (data.artifacts || []);
    } catch (e) {
      if (artifactsURL !== './artifacts.json') {
        console.warn(`Primary load failed (${e.message}). Falling back to ./artifacts.json`);
        const res2 = await fetch('./artifacts.json');
        const data2 = await res2.json();
        raw = Array.isArray(data2) ? data2 : (data2.artifacts || []);
      } else { throw e; }
    }

    console.log(`📊 Raw artifacts loaded: ${raw.length}`);

    // Prefer type specimens
    const typeOnly = raw.filter(a => a.type_specimen === true || a.type_specimen === 'true');
    this.artifacts = typeOnly.length ? typeOnly : raw;

    console.log(`🏺 Displaying ${this.artifacts.length} artifacts in VR space...`);
    this.updateTitleAndInfo();
  },

  getTombName: function () {
    try {
      const cfg = this.tombManager && this.tombManager.config;
      const curId = cfg?.current_tomb;
      const cur = cfg?.tombs?.[curId];
      return cur?.name || null;
    } catch { return null; }
  },

  updateTitleAndInfo: function () {
    const tombName = this.getTombName();
    if (this.tombTitleEl) this.tombTitleEl.setAttribute('value', tombName || 'AutoTomb VR');

    const visibleCount = (this.entities.length
      ? this.entities.filter(e => e.getAttribute('visible') !== false).length
      : (this.artifacts?.length || 0));
    if (this.infoEl) this.infoEl.setAttribute('value', `${visibleCount} artifacts visible`);

    if (window.AutoTomb?.setTombName) AutoTomb.setTombName(tombName || '—');
  },

  createFlashlight: function () {
    const attach = () => {
      const camEl = this.el.sceneEl?.camera?.el;
      if (!camEl) return false;
      const light = document.createElement('a-light');
      light.setAttribute('type', 'spot');
      light.setAttribute('color', '#fff');
      light.setAttribute('intensity', 1.0);
      light.setAttribute('angle', 25);
      light.setAttribute('distance', 30);
      light.setAttribute('penumbra', 0.4);
      light.setAttribute('position', '0 0 0');
      camEl.appendChild(light);
      return true;
    };
    if (!attach()) this.el.sceneEl.addEventListener('loaded', () => attach());
  },

  /* ------------------------ Rendering / Events ----------------------- */

  renderArtifacts: function () {
    const container = this.el.querySelector('#artifacts') || this.el;

    const fallbackRadius = 10;
    const baseScale = 0.4;
    const rotationSpeed = 0.1;

    this.entities = []; // reset

    this.artifacts.forEach((artifact) => {
      const entity = document.createElement('a-entity');
      entity.setAttribute('class', 'artifact interactable clickable');

      // Prefer cursor-listener (components.js). If not present, handle click here.
      if (AFRAME.components['cursor-listener']) {
        entity.setAttribute('cursor-listener', '');
      } else {
        entity.addEventListener('click', (evt) => {
          const base = artifact?.source_url;
          const mention = (artifact?.mention || artifact?.artifact_id || '').trim();
          if (base) openWithTextFragment(base, mention);
          evt.stopPropagation();
        });
      }

      // Position (robust parsing of array/object/"x y z"/"x,y,z")
      const pos = artifact.vr_position || artifact.position || artifact.xyz || null;
      if (pos != null) {
        let x=0,y=0,z=0;
        if (Array.isArray(pos)) { x = Number(pos[0]||0); y = Number(pos[1]||0); z = Number(pos[2]||0); }
        else if (typeof pos === 'string') {
          const m = pos.match(/-?\d+(\.\d+)?/g);
          if (m && m.length >= 3) { x = Number(m[0]); y = Number(m[1]); z = Number(m[2]); }
        } else { x = Number(pos.x ?? 0); y = Number(pos.y ?? 0); z = Number(pos.z ?? 0); }
        entity.setAttribute('position', `${x} ${y} ${z}`);
      } else {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.random() * Math.PI;
        const x = fallbackRadius * Math.sin(phi) * Math.cos(theta);
        const y = fallbackRadius * Math.cos(phi) + 1;
        const z = fallbackRadius * Math.sin(phi) * Math.sin(theta);
        entity.setAttribute('position', `${x} ${y} ${z}`);
      }

      // Cache original/semantic pos for reference
      entity._semanticPos = Object.assign({}, entity.getAttribute('position'));

      // Scale
      const vrScale = (artifact.vr_scale != null) ? Number(artifact.vr_scale) : 1;
      const s = Math.max(0.001, vrScale * baseScale);
      entity.setAttribute('scale', `${s} ${s} ${s}`);

      // Model
      let modelPath = null;
      if (this.tombManager && typeof this.tombManager.getModelPath === 'function') {
        modelPath = this.tombManager.getModelPath(artifact.artifact_id);
      }
      modelPath = modelPath || artifact.model_url || artifact.model_path;
      if (modelPath) entity.setAttribute('gltf-model', modelPath);

      // Expose artifact for listeners
      entity.artifact = artifact;

      // Hover → "Objects" console + cluster console for this voxel
      const mkTitle = () => {
        const maxChars = 120;
        let text = ((artifact.mention && artifact.mention.trim()) || artifact.artifact_id || 'Unknown').replace(/\s+/g, ' ');
        if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '…';
        return text;
      };

      entity.addEventListener('mouseenter', () => {
        window.AutoTomb?.setLabelConsole?.(mkTitle());
        entity.setAttribute('animation__hover_in', {
          property: 'scale', to: `${s * 1.1} ${s * 1.1} ${s * 1.1}`,
          dur: 200, easing: 'easeOutQuad'
        });
        this.updateClusterConsoleForEntity(entity);
      });

      entity.addEventListener('mouseleave', () => {
        window.AutoTomb?.setLabelConsole?.('');
        entity.setAttribute('animation__hover_out', {
          property: 'scale', to: `${s} ${s} ${s}`,
          dur: 200, easing: 'easeOutQuad'
        });
        this.recomputeClusters(); // restore global cluster summary
      });

      container.appendChild(entity);
      this.entities.push(entity);
      this.rotateObject(entity, rotationSpeed);
    });

    this.updateTitleAndInfo();
  },

  rotateObject: function (entity, speedDegPerTick) {
    const step = () => {
      const r = entity.getAttribute('rotation');
      if (r) entity.setAttribute('rotation', `${r.x} ${r.y + speedDegPerTick} ${r.z}`);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  /* --------------------------- Visibility toggles ------------------- */

  setSkyboxVisible: function (visible) {
    const sky = this.el.sceneEl.querySelector('#skybox');
    if (sky) sky.setAttribute('visible', !!visible);
  },

  setCampVisible: function (visible) {
    const camp = this.el.sceneEl.querySelector('#harvard-camp');
    if (camp) camp.setAttribute('visible', !!visible);
  },

  /* --------------------------- Date filter -------------------------- */

  _setupDateFilterUI: function () {
    const extent = this._computeDateExtent();
    if (!extent) {
      console.warn('[DateFilter] No parseable dates found; skipping date slider init.');
      this.activeDateFilter = null;
      this.updateTitleAndInfo();
      return;
    }
    // Default filter = full range
    this.activeDateFilter = { from: extent.min, to: extent.max };

    // Bind our slider helper (always visible)
    if (window.AutoTomb?.initDateSlider) {
      window.AutoTomb.initDateSlider(extent.min, extent.max, (range) => {
        if (!range || !range.from || !range.to) return;
        this.applyDateFilter(range);
      });
    }

    // Apply full range initially
    this.applyDateFilter(this.activeDateFilter);
  },

  applyDateFilter: function (range) {
    if (!range || !range.from || !range.to) return;
    this.activeDateFilter = { from: range.from, to: range.to };

    const within = (a) => {
      const b = this._getArtifactDateBounds(a);
      if (!b) return true; // keep undated items visible by default
      return !(b.endISO < range.from || b.startISO > range.to);
    };

    for (const el of this.entities) {
      el.setAttribute('visible', within(el.artifact));
    }

    this.updateTitleAndInfo();
    this.recomputeClusters();
  },

  _computeDateExtent: function () {
    const bounds = [];
    for (const a of (this.artifacts || [])) {
      const b = this._getArtifactDateBounds(a);
      if (b) bounds.push(b);
    }
    if (!bounds.length) return null;
    let min = bounds[0].startISO, max = bounds[0].endISO;
    for (const b of bounds) { if (b.startISO < min) min = b.startISO; if (b.endISO > max) max = b.endISO; }
    return { min, max };
  },

  _getArtifactDateBounds: function (a) {
    if (!a) return null;
    const single = ['date','diary_date','date_iso','excavation_date'];
    const startF = ['start_date','date_start','from'];
    const endF   = ['end_date','date_end','to'];

    const iso = (v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
    };

    let startISO = null, endISO = null;
    for (const f of startF) { if (a[f]) { startISO = iso(a[f]); if (startISO) break; } }
    for (const f of endF)   { if (a[f]) { endISO   = iso(a[f]); if (endISO)   break; } }
    if (startISO && endISO && startISO <= endISO) return { startISO, endISO };

    for (const f of single) {
      const s = iso(a[f]); if (s) return { startISO: s, endISO: s };
    }
    return null;
  },

  /* --------------------------- Clustering --------------------------- */

  // Simple string-matching for cluster labeling (unigrams)
  _clusterTopTerms: function (artifacts, topN = 5) {
    if (!artifacts || !artifacts.length) return [];

    const STOP = new Set([
      'a','an','the','and','or','of','in','on','at','to','for','from','with','by','as','is','are',
      'was','were','this','that','these','those','it','its','be','been','being','into','over','under',
      'near','around','about','between','within','without','through','during','per','via'
    ]);

    const counts = new Map();

    for (const a of artifacts) {
      const raw = (a?.mention || a?.artifact_id || '').toLowerCase();
      const tokens = raw
        .replace(/[“”‘’'"]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w && w.length > 2 && !STOP.has(w));

      const uniq = new Set(tokens);
      for (const t of uniq) counts.set(t, (counts.get(t) || 0) + 1);
    }

    const rows = Array.from(counts, ([term, count]) => ({ term, count }));
    rows.sort((a, b) => (b.count - a.count) || a.term.localeCompare(b.term));
    return rows.slice(0, topN);
  },

  recomputeClusters: function () {
    // Build voxel cells from VISIBLE entities (semantic fixed volume)
    const ents = (this.entities || []).filter(e => e.getAttribute('visible') !== false);
    const idx = (v) => Math.floor(v / this.clusterCellSize);
    const key3 = (x, y, z) => `${x}|${y}|${z}`;
    const cells = new Map();

    for (const el of ents) {
      const p = el.getAttribute('position');
      const k = key3(idx(p.x), 0, idx(p.z)); // cluster in XZ only
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(el);
    }

    const rows = [];
    for (const [k, arr] of cells.entries()) {
      if (arr.length < this.minClusterSize) continue;
      const arts = arr.map(e => e.artifact);
      const terms = this._clusterTopTerms(arts, 3);
      const label = terms.length ? terms.map(x => `“${x.term}”`).join(', ') : '(no shared term)';
      rows.push({ key: k, count: arr.length, term: label });
    }
    rows.sort((a, b) => b.count - a.count);
    if (window.AutoTomb?.setClusterConsole) AutoTomb.setClusterConsole(rows);
  },

  updateClusterConsoleForEntity: function (entity) {
    if (!entity) return;
    const p = entity.getAttribute('position');
    if (!p) return;

    const ents = (this.entities || []).filter(e => e.getAttribute('visible') !== false);
    const idx = (v) => Math.floor(v / this.clusterCellSize);
    const key3 = (x,y,z) => `${x}|${y}|${z}`;
    const k = key3(idx(p.x), 0, idx(p.z)); // XZ-only to avoid vertical splits

    // Build cell map once for speed
    const cellMap = new Map();
    for (const el of ents) {
      const q = el.getAttribute('position');
      const ck = key3(idx(q.x), 0, idx(q.z));
      if (!cellMap.has(ck)) cellMap.set(ck, []);
      cellMap.get(ck).push(el);
    }
    const arr = cellMap.get(k) || [];
    if (arr.length < this.minClusterSize) {
      if (window.AutoTomb?.setClusterConsole) {
        AutoTomb.setClusterConsole([{ term: '(no cluster here)', count: arr.length }]);
      }
      return;
    }

    const artsInCell = arr.map(e => e.artifact);
    const top = this._clusterTopTerms(artsInCell, 6);
    if (window.AutoTomb?.setClusterConsole) {
      AutoTomb.setClusterConsole(top.length ? top : [{ term: '(no shared term)', count: arr.length }]);
    }
  },

  _computeVoxelClusters: function ({ cellSize = 2, minClusterSize = 2, onlyVisible = true } = {}) {
    const ents = (this.entities || []).filter(e => !onlyVisible || e.getAttribute('visible') !== false);
    const cells = new Map();
    const idx = (v) => Math.floor(v / cellSize);
    const key3 = (x, y, z) => `${x}|${y}|${z}`;

    for (const el of ents) {
      const p = el.getAttribute('position');
      const k = key3(idx(p.x), 0, idx(p.z));
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(el);
    }

    const clusters = [];
    for (const [k, arr] of cells.entries()) {
      if (arr.length < minClusterSize) continue;
      const arts = arr.map(e => e.artifact);
      let term = this._sharedExplicitField(arts) ||
                 this._sharedTokenFromMentions(arts) ||
                 this._topToken(arts) ||
                 '(no shared term)';
      clusters.push({ key: k, count: arr.length, term });
    }
    clusters.sort((a, b) => b.count - a.count);
    return clusters;
  },

  _sharedExplicitField: function (arts) {
    const candidates = [
      'type','category','artifact_type',
      'canonical','canonical_name',
      'normalized_label','specimen','model_name'
    ];
    for (const field of candidates) {
      const values = arts.map(a => (a && a[field] != null) ? String(a[field]).trim().toLowerCase() : null);
      if (values.length && values.every(v => v && v === values[0])) return values[0];
    }
    return null;
  },

  _sharedTokenFromMentions: function (arts) {
    if (!arts || !arts.length) return null;

    const sets = arts.map(a => this._tokenize(
      (a && a.mention) ? a.mention : (a && a.artifact_id) ? String(a.artifact_id) : ''
    ));

    const N = this._Ndocs || (this.artifacts?.length || 1);
    const df = this._globalTokenDocFreq || new Map();

    const cTF = new Map(), cDF = new Map();
    for (const st of sets) for (const t of st) cDF.set(t, (cDF.get(t) || 0) + 1);
    for (const a of arts) for (const t of this._tokenize((a?.mention) || (a?.artifact_id) || '')) {
      cTF.set(t, (cTF.get(t) || 0) + 1);
    }

    const clusterSize = arts.length;
    const MIN_CLUSTER_SHARE = 0.6;
    const MAX_GLOBAL_PREVALENCE = 0.35;

    let best = null, bestScore = -Infinity;
    for (const [t, dfCluster] of cDF.entries()) {
      const share = dfCluster / clusterSize;
      if (share < MIN_CLUSTER_SHARE) continue;

      const dfGlobal = df.get(t) || 0;
      const globalPrev = dfGlobal / N;
      if (globalPrev >= MAX_GLOBAL_PREVALENCE) continue;

      const idf  = Math.log((N + 1) / (dfGlobal + 1));
      const lift = share / Math.max(globalPrev, 1e-6);
      const tf   = cTF.get(t) || 0;
      const score = (tf * idf) * lift;

      if (score > bestScore) { best = t; bestScore = score; }
    }
    return best || null;
  },

  _topToken: function (arts) {
    const N = this._Ndocs || (this.artifacts?.length || 1);
    const df = this._globalTokenDocFreq || new Map();
    const tf = new Map();
    const dfCluster = new Map();

    for (const a of arts) {
      const toks = this._tokenize((a?.mention) || (a?.artifact_id) || '');
      for (const t of toks) {
        dfCluster.set(t, (dfCluster.get(t) || 0) + 1);
        tf.set(t, (tf.get(t) || 0) + 1);
      }
    }

    const clusterSize = arts.length;
    const MAX_GLOBAL_PREVALENCE = 0.35;

    let best = null, bestScore = -Infinity;
    for (const [t, f] of tf.entries()) {
      const d = df.get(t) || 0;
      const globalPrev = d / N;
      if (globalPrev >= MAX_GLOBAL_PREVALENCE) continue;

      const idf  = Math.log((N + 1) / (d + 1));
      const share = (dfCluster.get(t) || 0) / clusterSize;
      const lift  = share / Math.max(globalPrev, 1e-6);
      const score = (f * idf) * lift;

      if (score > bestScore) { best = t; bestScore = score; }
    }
    return best || null;
  },

  _tokenize: function (s) {
    if (!s) return new Set();

    const STOP = new Set([
      'a','an','the','and','or','of','in','on','at','to','for','from','with','by','as','is','are',
      'was','were','this','that','these','those','it','its','be','been','being','into','over','under',
      'near','around','about','between','within','without','through','during','per','via'
    ]);

    const DOMAIN = new Set([
      'fragment','fragments','piece','pieces','object','objects','model','models',
      'pottery','sherd','sherds','stone','limestone','granite','sandstone','alabaster',
      'jar','jars','vase','vases','bowl','bowls','statue','statues',
      'inscribed','inscription','broken','large','small','base','upper','lower',
      'egypt','giza','tomb','site','room','area','pit'
    ]);

    const tokens = String(s)
      .toLowerCase()
      .replace(/[“”‘’'"]/g, '')
      .replace(/[^a-z0-9\- ]+/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length >= 3 && !STOP.has(w) && !DOMAIN.has(w));

    return new Set(tokens);
  },

  _buildGlobalTokenStats: function () {
    const df = new Map();
    const N  = (this.artifacts?.length || 0);

    for (const a of (this.artifacts || [])) {
      const seenPerDoc = new Set();
      const text = (a && a.mention)
                 ? a.mention
                 : (a && a.artifact_id) ? String(a.artifact_id) : '';
      for (const tok of this._tokenize(text)) {
        if (!seenPerDoc.has(tok)) {
          seenPerDoc.add(tok);
          df.set(tok, (df.get(tok) || 0) + 1);
        }
      }
    }
    this._globalTokenDocFreq = df;
    this._Ndocs = N;
  }
});

console.log('🏺 AutoTomb VR application (short alphabetic text-fragment highlighting, clusters, date slider, extras) loaded');
