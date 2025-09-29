// js/components.js
(function () {
  window.AutoTomb = window.AutoTomb || {};

  // --- Helpers used by cursor-listener ---
  function isXPathOrSelectorLike(s) {
    if (!s || typeof s !== 'string') return false;
    const t = s.trim();
    return (
      /^\/{1,2}/.test(t) ||
      /\/text\(\)/i.test(t) ||
      /\b(div|p|section)\[\d+\]/i.test(t) ||
      /[>~+\[\]#\.]/.test(t)
    );
  }

  function buildDGTextFragmentURL(baseURL, mention) {
    if (!mention || !baseURL) return { url: baseURL, candidates: [] };

    const NBH = '\u2011', END = '\u2013', EMD = '\u2014';

    const normalize = (s) => String(s)
      .replace(/\s+/g, ' ')
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();

    const hyphenVariants = (s) => {
      const out = new Set([s]);
      out.add(s.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-'));
      out.add(s.replace(/-/g, NBH));
      out.add(s.replace(/-/g, END));
      out.add(s.replace(/-/g, EMD));
      out.add(s.replace(/-/g, ''));
      out.add(s.replace(/-/g, ' '));
      return Array.from(out);
    };

    const clamp = (x, n = 160) => (x.length > n ? x.slice(0, n) : x);

    const raw = normalize(mention);
    const seeds = Array.from(new Set([raw, raw.toLowerCase()]));

    let variants = [];
    seeds.forEach(seed => variants.push(...hyphenVariants(seed)));

    const words = raw.toLowerCase().split(' ').filter(Boolean);
    if (words.length > 12) {
      const mid = Math.max(0, Math.floor(words.length / 2) - 6);
      variants.push(words.slice(mid, mid + 12).join(' '));
    }
    if (words.length >= 8) {
      const firstN = words.slice(0, 8).join(' ');
      const lastN  = words.slice(-8).join(' ');
      variants.push(`${firstN},${lastN}`);
    }
    variants.push(words.slice(0, Math.min(6, words.length)).join(' '));

    const candidates = Array.from(new Set(
      variants.map(normalize).filter(Boolean).map(v => clamp(v))
    ));

    const fragment = candidates.length
      ? '#:~:' + candidates.map(c => `text=${encodeURIComponent(c)}`).join('&')
      : '';

    const baseNoHash = baseURL.split('#', 1)[0];
    const sep = baseNoHash.includes('?') ? '&' : '?';
    const url = baseNoHash + sep + 'autotomb_find=' + encodeURIComponent(candidates[0] || raw) + fragment;

    return { url, candidates };
  }

  // --- A-Frame micro-components (guarded) ---
  if (!AFRAME.components['face-camera']) {
    AFRAME.registerComponent('face-camera', {
      schema: { yawOnly: { default: true }, onlyWhenVisible: { default: true } },
      init() {
        this.cameraEl = this.el.sceneEl?.camera?.el;
        this._camPos = new THREE.Vector3();
        this._selfPos = new THREE.Vector3();
      },
      tick() {
        if (!this.cameraEl) return;
        if (this.data.onlyWhenVisible && !this.el.getAttribute('visible')) return;
        this.cameraEl.object3D.getWorldPosition(this._camPos);
        this.el.object3D.getWorldPosition(this._selfPos);
        if (this.data.yawOnly) {
          const dx = this._camPos.x - this._selfPos.x;
          const dz = this._camPos.z - this._selfPos.z;
          const yaw = Math.atan2(dx, dz);
          this.el.object3D.rotation.set(0, yaw, 0);
        } else {
          this.el.object3D.lookAt(this._camPos);
        }
      }
    });
  }

  if (!AFRAME.components['follow-entity']) {
    AFRAME.registerComponent('follow-entity', {
      schema: {
        target: { type: 'selector' },
        offset: { type: 'vec3', default: { x: 0, y: 1.5, z: 0 } },
        onlyWhenVisible: { default: true }
      },
      init() { this._tmp = new THREE.Vector3(); },
      tick() {
        if (this.data.onlyWhenVisible && !this.el.getAttribute('visible')) return;
        const t = this.data.target && this.data.target.object3D;
        if (!t) return;
        t.getWorldPosition(this._tmp);
        this.el.object3D.position.set(
          this._tmp.x + this.data.offset.x,
          this._tmp.y + this.data.offset.y,
          this._tmp.z + this.data.offset.z
        );
      }
    });
  }

  if (!AFRAME.components['cursor-listener']) {
    AFRAME.registerComponent('cursor-listener', {
      init: function () {
        this.el.addEventListener('click', (event) => {
          const artifact = this.el.artifact;
          if (!artifact || !artifact.source_url) return;

          const mention = artifact.mention;
          if (isXPathOrSelectorLike(mention)) {
            window.open(artifact.source_url, '_blank');
          } else {
            const { url } = buildDGTextFragmentURL(artifact.source_url, mention);
            window.open(url, '_blank');
          }

          if (artifact.mention && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(artifact.mention).catch(()=>{});
          }
          event.stopPropagation();
        });
      }
    });
  }

  // expose helpers (optional)
  AutoTomb.isXPathOrSelectorLike = isXPathOrSelectorLike;
  AutoTomb.buildDGTextFragmentURL = buildDGTextFragmentURL;
})();
