// ui.js (root-level)
(function () {
  window.AutoTomb = window.AutoTomb || {};

  const $ = (sel) => document.querySelector(sel);

  /* ===================== Consoles ===================== */
  AutoTomb.setLabelConsole = function (text) {
    const box = $('#label-console');
    if (!box) return;
    if (text && String(text).trim()) {
      box.textContent = String(text).trim();
    } else {
      box.innerHTML = '<span class="hint">Hover an artifact to preview its title here…</span>';
    }
  };

  AutoTomb.setClusterConsole = function (clusters) {
    const box = $('#cluster-console');
    if (!box) return;
    if (!clusters || !clusters.length) {
      box.innerHTML = '<span class="hint">No clusters detected…</span>';
      return;
    }
    const html = clusters.map((c, i) => {
      const term = c.term || '(no shared term)';
      const count = c.count || 0;
      return `<div class="cluster-item">#${i+1} <span class="cluster-term">“${term}”</span> — ${count} item${count===1?'':'s'}</div>`;
    }).join('');
    box.innerHTML = html;
  };

  AutoTomb.setTombName = function (name) {
    const el = $('#tomb-subheader');
    if (!el) return;
    el.textContent = `Tomb: ${name || '—'}`;
  };

  /* ===================== Date Slider ===================== */
  // Dual-handle slider using two <input type="range"> mapped to day offsets.
  AutoTomb.initDateSlider = function (minISO, maxISO, onChange) {
    const minInp = $('#date-range-min');
    const maxInp = $('#date-range-max');
    const labFrom = $('#date-label-from');
    const labTo   = $('#date-label-to');
    if (!minInp || !maxInp || !labFrom || !labTo) return;

    const toDate = (iso) => new Date(iso + 'T00:00:00Z');
    const toISO  = (d)   => d.toISOString().slice(0,10);

    const minD = toDate(minISO);
    const maxD = toDate(maxISO);
    const totalDays = Math.max(0, Math.round((maxD - minD) / 86400000));

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

    minInp.min = '0'; maxInp.min = '0';
    minInp.max = String(totalDays); maxInp.max = String(totalDays);
    minInp.value = '0'; maxInp.value = String(totalDays);

    const render = () => {
      let a = parseInt(minInp.value, 10);
      let b = parseInt(maxInp.value, 10);
      // keep handles ordered
      if (a > b) { const t = a; a = b; b = t; }
      a = clamp(a, 0, totalDays);
      b = clamp(b, 0, totalDays);

      const from = new Date(minD.getTime() + a * 86400000);
      const to   = new Date(minD.getTime() + b * 86400000);

      labFrom.textContent = toISO(from);
      labTo.textContent   = toISO(to);

      if (typeof onChange === 'function') {
        onChange({ from: toISO(from), to: toISO(to) });
      }
    };

    minInp.addEventListener('input', render);
    maxInp.addEventListener('input', render);

    // Initial paint
    render();
  };

  /* ===================== Attach & Controls ===================== */
  AutoTomb.attachUI = function (viewer) {
    const toggle = $('#settings-toggle');
    const panel  = $('#settings-panel');

    // Toggle open/close
    if (toggle && panel) {
      toggle.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        toggle.textContent = panel.classList.contains('hidden') ? 'Settings ▾' : 'Settings ▴';
      });
    }

    // Layout radios (Semantic default, Location optional hook)
    const radios = Array.from(document.querySelectorAll('input[name="layout"]'));
    const sem = radios.find(r => r.value === 'semantic');
    if (sem) sem.checked = true;

    radios.forEach(r => {
      r.addEventListener('change', () => {
        const mode = r.value; // 'semantic' | 'location'
        if (typeof viewer.applyClustering === 'function') viewer.applyClustering(mode);
        else console.log('[UI] Layout selected:', mode);
      });
    });

    // Visibility toggles
    const skyToggle  = $('#toggle-skybox');
    const campToggle = $('#toggle-camp');
    skyToggle?.addEventListener('change', (e) => viewer?.setSkyboxVisible?.(!!e.target.checked));
    campToggle?.addEventListener('change', (e) => viewer?.setCampVisible?.(!!e.target.checked));

    // ---- Close dropdown only on a *true click* outside (no drag) ----
    let downX = 0, downY = 0, dragging = false;
    const isPointerLocked = () => {
      const el = document.pointerLockElement;
      return !!(el && el.classList && el.classList.contains('a-canvas'));
    };
    document.addEventListener('pointerdown', (e) => {
      downX = e.clientX || 0; downY = e.clientY || 0; dragging = false;
    }, { capture: true });
    document.addEventListener('pointermove', (e) => {
      if (dragging) return;
      const dx = (e.clientX || 0) - downX;
      const dy = (e.clientY || 0) - downY;
      if ((dx*dx + dy*dy) > 16) dragging = true; // ~4px
    }, { capture: true });
    document.addEventListener('pointerup', (e) => {
      if (!panel || panel.classList.contains('hidden')) return;
      if (isPointerLocked()) return;
      if (!dragging) {
        const within = e.target.closest('#settings');
        if (!within) {
          panel.classList.add('hidden');
          if (toggle) toggle.textContent = 'Settings ▾';
        }
      }
    }, { capture: true });
  };
})();
