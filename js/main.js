// Marketly — shared behaviour: nav, footer year, and motion
(function () {
  var root = document.documentElement;
  var animated = root.classList.contains('anim');   // set in <head> unless reduced motion

  /* ---------- Mobile navigation ---------- */
  var btn = document.querySelector('.menu-btn');
  var links = document.getElementById('nav-links');
  if (btn && links) {
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* Add Stackly's official social links to each shared footer. Local URLs keep
     the links present if the API is temporarily unavailable. */
  var socialUrls = {
    facebook: 'https://www.facebook.com/people/Stackly-Stackly/pfbid02NmgSaxmeD8WJngqrhKudvxzak9GvzPLz6YS9NMdJJM9rSeJ7ZTyG6h3HF3p3koBEl/?rdid=3qmngFeLJe3ChGfe&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BrqaZkJRe%2F',
    instagram: 'https://www.instagram.com/thestackly',
    linkedin: 'https://www.linkedin.com/company/the-stackly/',
    x: 'https://x.com/The_Stackly'
  };
  var socialInfo = {
    facebook: { label: 'Facebook', host: 'www.facebook.com', svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.6 21v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5H17V3.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.3H7.5v3.2h2.8V21h3.3z"/></svg>' },
    instagram: { label: 'Instagram', host: 'www.instagram.com', svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect class="instagram-stroke" x="3.3" y="3.3" width="17.4" height="17.4" rx="5"/><circle class="instagram-stroke" cx="12" cy="12" r="4.1"/><circle cx="17.8" cy="6.5" r="1.2"/></svg>' },
    linkedin: { label: 'LinkedIn', host: 'www.linkedin.com', svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.2 8.3A2.1 2.1 0 1 0 5.2 4a2.1 2.1 0 0 0 0 4.3ZM3.4 10h3.7v10.6H3.4zM9.2 10h3.5v1.5h.1a3.8 3.8 0 0 1 3.4-1.8c3.6 0 4.3 2.3 4.3 5.2v5.7h-3.7v-5c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7v5.1H9.2z"/></svg>' },
    x: { label: 'X', host: 'x.com', svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.9 3h2.8l-6.1 7 7.2 11h-5.6l-4.4-6.7L7 21H4.2l6.6-7.6L3.9 3h5.8l4 6.2L18.9 3Zm-1 16h1.5L8.7 4.9H7.1L17.9 19Z"/></svg>' }
  };
  function renderSocialLinks(links) {
    var grid = document.querySelector('.site-footer .footer-grid');
    if (!grid) return;
    var section = grid.querySelector('.footer-social');
    if (!section) {
      section = document.createElement('div');
      section.className = 'footer-social';
      section.innerHTML = '<h4>Follow us</h4><div class="footer-social-links"></div>';
      grid.appendChild(section);
    }
    var linksNode = section.querySelector('.footer-social-links');
    linksNode.textContent = '';
    Object.keys(socialInfo).forEach(function (key) {
      var info = socialInfo[key];
      var url = links[key] || socialUrls[key];
      try { if (new URL(url).hostname !== info.host || new URL(url).protocol !== 'https:') url = socialUrls[key]; }
      catch (e) { url = socialUrls[key]; }
      var link = document.createElement('a');
      link.className = 'footer-social-link';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'Stackly on ' + info.label + ' (opens in a new tab)');
      link.title = info.label;
      link.innerHTML = info.svg;
      linksNode.appendChild(link);
    });
  }
  renderSocialLinks(socialUrls);
  fetch((window.MARKETLY_API_BASE || 'http://127.0.0.1:8000') + '/api/v1/social-links')
    .then(function (response) { if (!response.ok) throw new Error('social links unavailable'); return response.json(); })
    .then(renderSocialLinks)
    .catch(function () {});

  /* ---------- Header shadow after scrolling ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Keep the session visible while browsing public pages. Home is a normal
     navigation destination; only the explicit Sign out action ends a session. */
  var navActions = document.querySelector('.nav-actions');
  var accessToken = '';
  try {
    accessToken = localStorage.getItem('marketly_access_token') || sessionStorage.getItem('marketly_access_token') || '';
  } catch (e) {}
  var isAuth = false;
  try {
    isAuth = (localStorage.getItem('marketly_authenticated') === 'true' || sessionStorage.getItem('marketly_authenticated') === 'true') && Boolean(accessToken);
  } catch (e) {}

  if (navActions && isAuth) {
    var cachedName = 'Dashboard';
    try {
      var rawName = localStorage.getItem('marketly_name') || sessionStorage.getItem('marketly_name');
      cachedName = rawName ? JSON.parse(rawName) : cachedName;
    } catch (e) {}

    function clearSession() {
      try {
        localStorage.removeItem('marketly_access_token');
        localStorage.removeItem('marketly_authenticated');
        localStorage.removeItem('marketly_name');
        localStorage.removeItem('marketly_user');
        sessionStorage.removeItem('marketly_access_token');
        sessionStorage.removeItem('marketly_authenticated');
        sessionStorage.removeItem('marketly_name');
        sessionStorage.removeItem('marketly_user');
      } catch (e) {}
    }

    function setSignedInNav(user) {
      var displayName = (user && user.full_name) || cachedName || 'Dashboard';
      var nameLink = navActions.querySelector('a.login');
      if (nameLink) {
        nameLink.href = 'dashboard.html';
        nameLink.textContent = displayName;
        nameLink.setAttribute('aria-label', 'Signed in as ' + displayName + '. Open dashboard.');
      } else if (!navActions.querySelector('.session-user')) {
        var name = document.createElement('a');
        name.className = 'login session-user';
        name.href = 'dashboard.html';
        name.textContent = displayName;
        nameActionsInsert(name);
      }
      document.querySelectorAll('a[href="onboarding.html"]').forEach(function (link) {
        link.href = 'dashboard.html';
        if (link.closest('.nav-actions')) link.textContent = 'Dashboard';
      });
      var signOut = document.getElementById('logout-button');
      if (!signOut) {
        signOut = document.createElement('button');
        signOut.id = 'logout-button';
        signOut.type = 'button';
        signOut.className = 'btn btn-dark btn-sm';
        signOut.textContent = 'Sign out';
        navActions.appendChild(signOut);
      }
      if (!signOut.dataset.bound) {
        signOut.dataset.bound = 'true';
        signOut.addEventListener('click', function () {
          var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
          if (apiBase) {
            fetch(apiBase + '/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
              .catch(function () {})
              .finally(function () {
                clearSession();
                window.location.replace('login.html');
              });
          } else {
            clearSession();
            window.location.replace('login.html');
          }
        });
      }
      try {
        localStorage.setItem('marketly_name', JSON.stringify(displayName));
        sessionStorage.setItem('marketly_name', JSON.stringify(displayName));
      } catch (e) {}
    }
    function nameActionsInsert(link) { navActions.insertBefore(link, navActions.firstChild); }

    // Render signed-in state immediately so navigation is seamless without any delay or flicker
    setSignedInNav({ full_name: cachedName });

    // Background validation only if live backend configured and not a client token
    var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
    if (apiBase && accessToken && accessToken.indexOf('client_token_') !== 0) {
      fetch(apiBase + '/api/v1/auth/me', { headers: { 'Authorization': 'Bearer ' + accessToken }, credentials: 'include' })
        .then(function (response) {
          if (response.status === 401) {
            return fetch(apiBase + '/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
              .then(function (res) {
                if (!res.ok) throw new Error('Session expired');
                return res.json();
              })
              .then(function (body) {
                try {
                  localStorage.setItem('marketly_access_token', body.access_token);
                  sessionStorage.setItem('marketly_access_token', body.access_token);
                } catch (e) {}
                return fetch(apiBase + '/api/v1/auth/me', { headers: { 'Authorization': 'Bearer ' + body.access_token }, credentials: 'include' }).then(function (r) { return r.json(); });
              });
          }
          if (response.ok) return response.json();
          return null;
        })
        .then(function (user) {
          if (user && user.full_name) setSignedInNav(user);
        })
        .catch(function (err) {
          // Never log out on network or offline errors. Only explicit session expiration causes logout.
          if (err && err.message === 'Session expired') {
            clearSession();
            window.location.replace('login.html');
          }
        });
    }
  }

  if (!animated) return;

  /* ---------- Fade out when leaving the page ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.hasAttribute('download')) return;
    if (a.protocol !== location.protocol || a.host !== location.host) return;
    if (a.pathname === location.pathname && a.search === location.search) return;   // same-page / hash links
    e.preventDefault();
    root.classList.add('leaving');
    setTimeout(function () { location.href = a.href; }, 220);
  });
  window.addEventListener('pageshow', function () { root.classList.remove('leaving'); });

  /* ---------- Chart bars: give each bar an index for staggering ---------- */
  document.querySelectorAll('.bars, .perf-bars, .hero-bars, .mini').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (b, i) { b.style.setProperty('--i', i); });
  });

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var text = el.textContent.trim();
    var m = text.match(/^(\D*)([\d,]+)(.*)$/);
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ''), 10);
    var grouped = m[2].indexOf(',') > -1;
    el.setAttribute('aria-label', text);
    var start = null, dur = 1200;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = Math.round(target * eased);
      el.textContent = m[1] + (grouped ? v.toLocaleString('en-IN') : v) + m[3];
      if (p < 1) requestAnimationFrame(tick); else el.textContent = text;
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Scroll reveal ---------- */
  var SELECTOR = [
    '.sec-head', '.problem', '.service', '.stat', '.chart', '.step', '.quote', '.cta .wrap > *',
    '.kpi', '.perf', '.dash-grid h2', '.happening li', '.side .btn', '.page-head',
    '.glance .card', '.ins-section > h2', '.panel', '.next', '.footnote',
    '.card', '.svc', '.split > *', '.faq details', '.contact-box', '.tabs',
    '.marquee-view', '.split-feature > *', '.b-item', '.dash-row > div', '.welcome', '.head-art'
  ].join(',');
  var items = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  var counters = {};
  var seen = new Map();

  if (!('IntersectionObserver' in window)) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      io.unobserve(el);
      el.classList.add('is-in');
      el.querySelectorAll('.stat strong, .kpi strong, .glance strong, .b-item strong').forEach(countUp);
      if (el.matches('.stat, .kpi, .glance .card, .b-item')) { var s = el.querySelector('strong'); if (s && !s.getAttribute('aria-label')) countUp(s); }
      // After the entrance finishes, hand control back to the normal hover transitions
      setTimeout(function () {
        el.classList.remove('reveal', 'is-in');
        el.style.transitionDelay = '';
      }, 1400);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach(function (el) {
    var idx = seen.get(el.parentNode) || 0;
    seen.set(el.parentNode, idx + 1);
    el.classList.add('reveal');
    el.style.transitionDelay = Math.min(idx, 5) * 80 + 'ms';
    io.observe(el);
  });

  /* ---------- Charts grow when visible ---------- */
  var chartIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('in'); chartIO.unobserve(entry.target); }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.bars, .perf-bars').forEach(function (c) { chartIO.observe(c); });
})();
