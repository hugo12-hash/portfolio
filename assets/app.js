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

  // Captures agrandissables : visionneuse commune à toute la page
  var zooms = [].slice.call(document.querySelectorAll('.zoom'));
  var box = document.querySelector('.lightbox');
  if (zooms.length) {
    var shots = zooms.map(function (btn) {
      var img = btn.querySelector('img');
      var cap = btn.parentNode.querySelector('figcaption');
      return { src: img.getAttribute('src'), alt: img.getAttribute('alt'), w: img.getAttribute('width'), h: img.getAttribute('height'), cap: cap ? cap.textContent : img.getAttribute('alt') };
    });
    if (box && typeof box.showModal === 'function') {
      var bImg = box.querySelector('img'), bCap = box.querySelector('figcaption'), bCount = box.querySelector('.lightbox__count');
      var opener = null, lb = 0;
      if (shots.length < 2) box.classList.add('lightbox--single');
      function paint(i) {
        lb = (i + shots.length) % shots.length;
        var s = shots[lb];
        bImg.src = s.src; bImg.alt = s.alt; bImg.width = s.w; bImg.height = s.h;
        bCap.textContent = s.cap;
        bCount.textContent = (lb + 1) + ' / ' + shots.length;
      }
      zooms.forEach(function (btn, i) {
        btn.addEventListener('click', function () {
          opener = btn; paint(i); box.showModal(); document.body.style.overflow = 'hidden';
        });
      });
      box.querySelector('[data-lb="-1"]').addEventListener('click', function () { paint(lb - 1); });
      box.querySelector('[data-lb="1"]').addEventListener('click', function () { paint(lb + 1); });
      box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
      box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__fig')) box.close(); });
      box.addEventListener('keydown', function (e) {
        if (shots.length < 2) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); paint(lb + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); paint(lb - 1); }
      });
      box.addEventListener('close', function () { document.body.style.overflow = ''; if (opener) opener.focus(); });
    } else {
      zooms.forEach(function (btn, i) { btn.addEventListener('click', function () { window.location.href = shots[i].src; }); });
    }
  }

  // Bandeau de projets (page Projets)
  var strip = document.querySelector('.strip');
  if (strip) {
    var sTrack = strip.querySelector('.strip__track');
    var bar = strip.querySelector('.strip__progress span');
    var sPrev = strip.querySelector('[data-strip="-1"]');
    var sNext = strip.querySelector('[data-strip="1"]');
    function step() {
      var card = sTrack.querySelector('.pcard');
      var gap = parseFloat(getComputedStyle(sTrack).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : sTrack.clientWidth;
    }
    function sSync() {
      var max = sTrack.scrollWidth - sTrack.clientWidth;
      var ratio = sTrack.clientWidth / sTrack.scrollWidth;
      if (bar) {
        bar.style.width = (ratio * 100).toFixed(2) + '%';
        bar.style.transform = 'translateX(' + (max > 0 ? (sTrack.scrollLeft / max) * (1 / ratio - 1) * 100 : 0).toFixed(2) + '%)';
      }
      if (sPrev) sPrev.disabled = sTrack.scrollLeft <= 2;
      if (sNext) sNext.disabled = sTrack.scrollLeft >= max - 2;
    }
    [sPrev, sNext].forEach(function (b) {
      if (b) b.addEventListener('click', function () {
        sTrack.scrollBy({ left: step() * parseInt(b.getAttribute('data-strip'), 10), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    sTrack.addEventListener('scroll', function () { window.requestAnimationFrame(sSync); }, { passive: true });
    window.addEventListener('resize', sSync);
    sSync();
  }

  // Curseur sur les projets et les captures
  var cursor = document.querySelector('.cursor');
  var hot = [].slice.call(document.querySelectorAll('.case a, .next, .zoom, .pcard a'));
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
