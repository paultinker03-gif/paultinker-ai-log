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
