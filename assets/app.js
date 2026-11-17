(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Titres : apparition ligne par ligne au chargement
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
  });

  // Barre de navigation : fond dès qu'on quitte le haut de page
  var nav = document.getElementById('nav');

  // Apparitions au défilement
  var targets = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Index latéral : section en cours
  var spies = [].slice.call(document.querySelectorAll('[data-spy]'));
  if (spies.length && 'IntersectionObserver' in window) {
    var groups = { 'accueil': ['accueil'], 'projets': ['projets'], 'a-propos': ['a-propos', 'competences'], 'contact': ['contact'] };
    var owner = {};
    Object.keys(groups).forEach(function (k) { groups[k].forEach(function (id) { owner[id] = k; }); });
    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var key = owner[e.target.id];
        spies.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('data-spy') === key ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(owner).forEach(function (id) { var s = document.getElementById(id); if (s) spyIO.observe(s); });
  }

  // Parallaxe du hero : défilement + pointeur, lissés
  var layers = [].slice.call(document.querySelectorAll('[data-depth]'));
  var hero = document.getElementById('accueil');
  var px = 0, py = 0, cx = 0, cy = 0, sy = 0, ticking = false;

  function frame() {
    cx += (px - cx) * 0.08; cy += (py - cy) * 0.08;
    var limit = hero ? hero.offsetHeight : 0;
    var s = Math.min(sy, limit);
    for (var i = 0; i < layers.length; i++) {
      var d = parseFloat(layers[i].getAttribute('data-depth'));
      layers[i].style.transform = 'translate3d(' + (cx * d * 220).toFixed(1) + 'px,' + (cy * d * 220 - s * d * 1.6).toFixed(1) + 'px,0)';
    }
    if (Math.abs(px - cx) + Math.abs(py - cy) > 0.001) { requestAnimationFrame(frame); } else { ticking = false; }
  }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  function onScroll() {
    sy = window.scrollY;
    if (nav) nav.classList.toggle('is-stuck', sy > 24);
    if (layers.length && !reduce) kick();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (hero && layers.length && !reduce && fine) {
    hero.addEventListener('pointermove', function (e) {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { px = 0; py = 0; kick(); });
  }

  // Carrousel de captures et visionneuse
  var gallery = document.querySelector('.gallery');
  if (gallery) {
    var track = gallery.querySelector('.gallery__track');
    var slides = [].slice.call(track.children);
    var current = gallery.querySelector('[data-current]');
    var prev = gallery.querySelector('[data-dir="-1"]');
    var next = gallery.querySelector('[data-dir="1"]');
    var at = 0;
    function show(i) {
      at = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[at].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    }
    function sync() {
      var i = Math.round(track.scrollLeft / track.clientWidth);
      at = Math.max(0, Math.min(slides.length - 1, i));
      if (current) current.textContent = at + 1;
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === slides.length - 1;
    }
    [prev, next].forEach(function (b) { if (b) b.addEventListener('click', function () { show(at + parseInt(b.getAttribute('data-dir'), 10)); }); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    });
    sync();

    var box = document.querySelector('.lightbox');
    var shots = slides.map(function (li) {
      var img = li.querySelector('img');
      return { src: img.getAttribute('src'), alt: img.getAttribute('alt'), w: img.getAttribute('width'), h: img.getAttribute('height') };
    });
    if (box && typeof box.showModal === 'function') {
      var bImg = box.querySelector('img'), bCap = box.querySelector('figcaption'), bCount = box.querySelector('.lightbox__count');
      var bPrev = box.querySelector('[data-lb="-1"]'), bNext = box.querySelector('[data-lb="1"]');
      var opener = null, lb = 0;
      if (shots.length < 2) box.classList.add('lightbox--single');
      function paint(i) {
        lb = (i + shots.length) % shots.length;
        var s = shots[lb];
        bImg.src = s.src; bImg.alt = s.alt; bImg.width = s.w; bImg.height = s.h;
        bCap.textContent = s.alt;
        bCount.textContent = (lb + 1) + ' / ' + shots.length;
      }
      gallery.querySelectorAll('.gallery__open').forEach(function (btn) {
        btn.addEventListener('click', function () {
          opener = btn; paint(parseInt(btn.getAttribute('data-index'), 10));
          box.showModal(); document.body.style.overflow = 'hidden';
        });
      });
      bPrev.addEventListener('click', function () { paint(lb - 1); });
      bNext.addEventListener('click', function () { paint(lb + 1); });
      box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
      box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__fig')) box.close(); });
      box.addEventListener('keydown', function (e) {
        if (shots.length < 2) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); paint(lb + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); paint(lb - 1); }
      });
      box.addEventListener('close', function () {
        document.body.style.overflow = '';
        show(lb);
        if (opener) opener.focus();
      });
    } else {
      // Sans visionneuse : ouvrir l'image seule
      gallery.querySelectorAll('.gallery__open').forEach(function (btn) {
        btn.addEventListener('click', function () { window.location.href = shots[parseInt(btn.getAttribute('data-index'), 10)].src; });
      });
    }
  }

  // Curseur sur les projets et les captures
  var cursor = document.querySelector('.cursor');
  var hot = [].slice.call(document.querySelectorAll('.case a, .next, .gallery__open'));
  if (cursor && hot.length && fine && !reduce) {
    var mx = -100, my = -100, kx = -100, ky = -100, live = false;
    function follow() {
      kx += (mx - kx) * 0.2; ky += (my - ky) * 0.2;
      cursor.style.transform = 'translate3d(' + kx.toFixed(1) + 'px,' + ky.toFixed(1) + 'px,0)';
      if (live) requestAnimationFrame(follow);
    }
    hot.forEach(function (el) {
      el.addEventListener('pointerenter', function (e) {
        mx = kx = e.clientX; my = ky = e.clientY;
        cursor.textContent = el.getAttribute('data-cursor') || 'Voir';
        cursor.classList.add('is-on');
        if (!live) { live = true; requestAnimationFrame(follow); }
      });
      el.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); live = false; });
    });
  }
})();
