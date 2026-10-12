// Small enhancements: reading progress, the phone menu, carousels and the full-size image view.
// Every entry has its own page, so everything works without JavaScript too.
(() => {
  document.documentElement.classList.add('js');

  // Reading progress along the bottom of the top bar, as on the case studies.
  const bar = document.querySelector('.progress');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('entry-nav');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    });
  }

  // Carousels: arrows and arrow keys move one image; the counter follows swipes too.
  document.querySelectorAll('.carousel').forEach((c) => {
    const track = c.querySelector('.carousel-track');
    const slides = [...track.children];
    const prev = c.querySelector('.carousel-prev');
    const next = c.querySelector('.carousel-next');
    const count = c.querySelector('.carousel-count');
    const index = () => Math.round(track.scrollLeft / (track.clientWidth || 1));
    const go = (i) => {
      const to = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: to * track.clientWidth });
    };
    const update = () => {
      const i = index();
      count.textContent = (i + 1) + ' / ' + slides.length;
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    };
    prev.addEventListener('click', () => go(index() - 1));
    next.addEventListener('click', () => go(index() + 1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
    });
    track.addEventListener('scroll', update, { passive: true });
    update();
  });

  // Chat carousels: a live phone (its own small page) that moves a conversation on one step per slide.
  // It starts paused. Play steps through to the end, waiting for each step's messages to arrive before moving on;
  // Pause or the arrows stop it. Clicking the phone shows it bigger.
  document.querySelectorAll('.chat-demo').forEach((c) => {
    const frame = c.querySelector('iframe');
    const panel = c.querySelector('.chat-panel');
    const steps = [...c.querySelectorAll('.chat-steps li')];
    const list = c.querySelector('.chat-steps');
    const prev = c.querySelector('.carousel-prev');
    const next = c.querySelector('.carousel-next');
    const count = c.querySelector('.carousel-count');
    const play = c.querySelector('.carousel-play');
    const n = steps.length;
    const DWELL = 3200;
    let at = 0;
    let playing = false;
    let visible = false;
    let timer = null;
    let waiting = false;
    let big = null;

    const demo = (f) => { try { return f.contentWindow && f.contentWindow.tobiDemo; } catch (e) { return null; } };
    const setPlaying = (on) => {
      playing = on;
      clearTimeout(timer);
      play.querySelector('span').textContent = on ? 'Pause' : 'Play';
      play.classList.toggle('is-playing', on);
      // Announce each step only when someone moves it on themselves.
      list.setAttribute('aria-live', on ? 'off' : 'polite');
    };
    const advance = () => {
      clearTimeout(timer);
      if (!playing) return;
      if (!visible) { waiting = true; return; }
      if (at >= n - 1) { setPlaying(false); return; }
      timer = setTimeout(() => { if (playing && visible) show(at + 1); else waiting = true; }, DWELL);
    };
    const show = (i, opts = {}) => {
      at = Math.max(0, Math.min(n - 1, i));
      steps.forEach((s, k) => s.classList.toggle('on', k === at));
      panel.setAttribute('aria-label', `${at + 1} of ${n}`);
      count.textContent = `${at + 1} / ${n}`;
      prev.disabled = at === 0;
      next.disabled = at === n - 1;
      const d = demo(frame);
      if (d) d.go(at, advance, opts.instant);
      if (big) { const bd = demo(big.frame); if (bd) bd.go(at, null, opts.instant); big.update(); }
    };
    const manual = (i) => { setPlaying(false); show(i); };
    prev.addEventListener('click', () => manual(at - 1));
    next.addEventListener('click', () => manual(at + 1));
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); manual(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); manual(at + 1); }
    });
    play.addEventListener('click', () => {
      if (playing) { setPlaying(false); return; }
      setPlaying(true);
      visible = true; // it was just clicked, so it's on screen
      show(at >= n - 1 ? 0 : at + (at === 0 && !c.dataset.started ? 0 : 1));
      c.dataset.started = '1';
    });

    // Starts paused; once playing, it holds while scrolled away and carries on when it's back on screen.
    const ready = () => {
      show(at, { instant: true });
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && waiting) { waiting = false; advance(); }
      }, { threshold: 0.25 }).observe(panel);
    };
    if (demo(frame)) ready(); else frame.addEventListener('load', ready, { once: true });

    // The bigger view: the same conversation in a larger phone, with its own arrows.
    c.querySelector('.chat-enlarge').addEventListener('click', () => {
      setPlaying(false);
      const dlg = document.createElement('dialog');
      dlg.className = 'lightbox chat-lightbox';
      dlg.setAttribute('aria-label', 'Enlarged phone');
      dlg.innerHTML = `<div class="chat-phone chat-phone-big"><iframe src="${frame.getAttribute('src')}" title="${frame.title}" tabindex="-1"></iframe></div>`
        + '<div class="lightbox-nav">'
        + '<button type="button" class="lightbox-prev" aria-label="Previous step">&larr;</button>'
        + '<span class="lightbox-count" aria-live="polite"></span>'
        + '<button type="button" class="lightbox-next" aria-label="Next step">&rarr;</button>'
        + '<button type="button" class="lightbox-close" aria-label="Close">&times;</button>'
        + '</div>';
      document.body.appendChild(dlg);
      const lbCount = dlg.querySelector('.lightbox-count');
      const lbPrev = dlg.querySelector('.lightbox-prev');
      const lbNext = dlg.querySelector('.lightbox-next');
      big = {
        frame: dlg.querySelector('iframe'),
        update: () => { lbCount.textContent = `${at + 1} / ${n}`; lbPrev.disabled = at === 0; lbNext.disabled = at === n - 1; },
      };
      big.update();
      big.frame.addEventListener('load', () => { const bd = demo(big && big.frame); if (bd) bd.go(at, null, true); }, { once: true });
      lbPrev.addEventListener('click', () => show(at - 1));
      lbNext.addEventListener('click', () => show(at + 1));
      dlg.querySelector('.lightbox-close').addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
      });
      dlg.addEventListener('close', () => { big = null; dlg.remove(); c.querySelector('.chat-enlarge').focus(); });
      dlg.showModal();
    });
  });

  // Click an image to view it full size (Esc, or a click on the picture, closes it).
  // Inside a carousel, arrows (and the arrow keys) step through its images without closing.
  const lightbox = document.createElement('dialog');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('aria-label', 'Enlarged image');
  lightbox.innerHTML = '<img alt="">'
    + '<div class="lightbox-nav">'
    + '<button type="button" class="lightbox-prev" aria-label="Previous image">&larr;</button>'
    + '<span class="lightbox-count" aria-live="polite"></span>'
    + '<button type="button" class="lightbox-next" aria-label="Next image">&rarr;</button>'
    + '<button type="button" class="lightbox-close" aria-label="Close">&times;</button>'
    + '</div>';
  document.body.appendChild(lightbox);
  const big = lightbox.querySelector('img');
  const lbNav = lightbox.querySelector('.lightbox-nav');
  const lbCount = lightbox.querySelector('.lightbox-count');
  const lbPrev = lightbox.querySelector('.lightbox-prev');
  const lbNext = lightbox.querySelector('.lightbox-next');
  let group = [];
  let at = 0;

  const show = (i) => {
    at = Math.max(0, Math.min(group.length - 1, i));
    const img = group[at];
    big.src = img.dataset.full || img.currentSrc || img.src;
    big.alt = img.alt;
    const many = group.length > 1;
    lbPrev.hidden = lbNext.hidden = lbCount.hidden = !many;
    lbCount.textContent = (at + 1) + ' / ' + group.length;
    lbPrev.disabled = at === 0;
    lbNext.disabled = at === group.length - 1;
    // Keep the carousel underneath on the same image.
    const track = img.closest('.carousel-track');
    if (track) track.scrollTo({ left: at * track.clientWidth, behavior: 'auto' });
  };

  lbPrev.addEventListener('click', (e) => { e.stopPropagation(); show(at - 1); });
  lbNext.addEventListener('click', (e) => { e.stopPropagation(); show(at + 1); });
  lbNav.addEventListener('click', (e) => e.stopPropagation());
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });

  document.addEventListener('click', (e) => {
    const img = e.target.closest && e.target.closest('.media img:not(.slide-badge)');
    if (!img || !lightbox.showModal || lightbox.contains(img)) return;
    const carousel = img.closest('.carousel');
    group = carousel ? [...carousel.querySelectorAll('.slide-media img')] : [img];
    lightbox.showModal();
    show(group.indexOf(img));
  });
})();
