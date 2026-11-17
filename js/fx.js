// Marketly — extra visual effects (progress bar, rotating headline, tilt, glow, ripples, confetti…)
// Everything here is decoration only; the site works the same without it.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#fbbf24', '#14b8a6', '#0ea5e9', '#22c55e'];

  /* ---------- Confetti (exposed for other scripts) ---------- */
  function confetti(opts) {
    if (reduce) return;
    opts = opts || {};
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:300';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    var ox = (opts.x != null ? opts.x : 0.5) * W, oy = (opts.y != null ? opts.y : 0.6) * H;
    var n = opts.count || 140, parts = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - .5) * 1.9, s = (6 + Math.random() * 11) * dpr;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: (6 + Math.random() * 7) * dpr, h: (4 + Math.random() * 5) * dpr,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COLORS[i % COLORS.length], round: Math.random() < .3 });
    }
    var t0 = performance.now();
    (function frame(t) {
      var life = t - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += .32 * dpr; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - life / 2600);
        ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.4, 0, 6.3); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (life < 2700) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }
  window.MarketlyFX = { confetti: confetti };

  /* ---------- Scroll progress bar + back-to-top ---------- */
  var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var top = document.createElement('button'); top.type = 'button'; top.className = 'to-top'; top.setAttribute('aria-label', 'Back to top'); top.textContent = '↑';
  document.body.appendChild(top);
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(scrollY / h, 1) : 0) + ')';
      top.classList.toggle('show', scrollY > 700);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Button ripple ---------- */
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.btn');
    if (!b || reduce) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
    var s = document.createElement('span'); s.className = 'ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
  });

  /* ---------- Rotating headline words ---------- */
  var rot = document.querySelector('.rotator');
  if (rot && !reduce) {
    var words = Array.prototype.slice.call(rot.children), cur = 0;
    setInterval(function () {
      var prev = words[cur]; cur = (cur + 1) % words.length;
      prev.classList.remove('on'); prev.classList.add('off');
      words[cur].classList.remove('off'); words[cur].classList.add('on');
      setTimeout(function () { prev.classList.remove('off'); }, 600);
    }, 2800);
  }

  /* ---------- Hero: cursor glow + parallax ---------- */
  var hero = document.querySelector('.hero');
  if (hero && fine && !reduce) {
    var layers = hero.querySelectorAll('.blob, .float-card, .hero-icon, .spark');
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      hero.style.setProperty('--mx', x + 'px'); hero.style.setProperty('--my', y + 'px');
      var cx = (x / r.width - .5), cy = (y / r.height - .5);
      layers.forEach(function (el, i) {
        var depth = (i % 4 + 1) * 6;
        el.style.translate = (-cx * depth) + 'px ' + (-cy * depth) + 'px';
      });
    });
  }

  /* ---------- 3D tilt on cards ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.problem, .service, .card, .svc, .quote, .step, .stat, .kpi').forEach(function (el) {
      el.classList.add('tilt');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- Magnetic primary buttons ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.hero .btn, .cta .btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * .18) + 'px ' + ((e.clientY - r.top - r.height / 2) * .28) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  /* ---------- Donut + progress bars animate on view ---------- */
  var targets = document.querySelectorAll('.donut, .prog');
  if (targets.length) {
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('in'); }); }
    else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.3 });
      targets.forEach(function (t) { io.observe(t); });
    }
  }
  // dashboard: confetti hello once after sign-in
  if (document.querySelector('.welcome')) {
    try {
      if (sessionStorage.getItem('marketly_welcomed') !== '1') {
        sessionStorage.setItem('marketly_welcomed', '1');
        setTimeout(function () { confetti({ x: .5, y: .35, count: 110 }); }, 700);
      }
    } catch (e) {}
  }
})();
