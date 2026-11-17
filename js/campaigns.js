// Campaigns: list, All/Active/Completed tabs, details + create dialogs
(function () {
  var BASE = [
    { name: 'Summer Sale',       channels: 'Instagram + Google',  spent: 8500,  leads: 428, roi: 32, status: 'active' },
    { name: 'Brand Awareness',   channels: 'Instagram',           spent: 5200,  leads: 312, roi: 21, status: 'completed' },
    { name: 'New Product Launch',channels: 'Google Ads + Email',  spent: 11800, leads: 544, roi: 45, status: 'active' },
    { name: 'Weekend Offer',     channels: 'Instagram + Facebook',spent: 3900,  leads: 186, roi: 18, status: 'completed' }
  ];
  var KEY = 'marketly_custom_campaigns';
  var custom = [];
  try { custom = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}

  var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
  var api = apiBase ? (apiBase + '/api/v1') : '';

  function getAuthHeader() {
    var headers = { 'Content-Type': 'application/json' };
    try {
      var token = localStorage.getItem('marketly_access_token') || sessionStorage.getItem('marketly_access_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } catch (e) {}
    return headers;
  }

  function loadBackendCampaigns() {
    if (!api) return;
    fetch(api + '/campaigns', { headers: getAuthHeader(), credentials: 'include' })
      .then(function (res) { if (!res.ok) throw new Error('API offline'); return res.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          custom = data;
          try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (e) {}
          render();
        }
      })
      .catch(function () {});
  }

  var list = document.getElementById('campaign-list');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var filter = 'all';

  function inr(n) { return '₹' + n.toLocaleString('en-IN'); }
  function all() {
    return custom.some(function (c) { return c.name === 'Summer Sale'; }) ? custom : custom.concat(BASE);
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function cell(text, cls) { return el('div', cls, text); }

  function render() {
    list.textContent = '';
    var items = all().filter(function (c) { return filter === 'all' || c.status === filter; });
    if (!items.length) {
      list.appendChild(el('p', 'empty', 'No ' + filter + ' campaigns yet. Create a campaign to get started.'));
      return;
    }
    items.forEach(function (c, i) {
      var row = el('article', 'campaign is-' + c.status);
      row.style.setProperty('--i', i);
      var title = el('div');
      var h3 = el('h3', null, c.name);
      h3.appendChild(el('span', 'badge ' + c.status, c.status === 'active' ? 'Active' : 'Completed'));
      title.appendChild(h3);
      title.appendChild(el('p', 'channels', c.channels));
      row.appendChild(title);
      row.appendChild(cell(inr(c.spent) + ' spent'));
      row.appendChild(cell(c.leads + ' leads'));
      row.appendChild(cell(c.spent || c.leads ? '+' + c.roi + '% ROI' : 'No ROI yet', 'roi'));
      var btn = el('button', 'btn btn-outline', 'View Details');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'View details for ' + c.name);
      btn.addEventListener('click', function () { openDetails(c); });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  function setFilter(f, focus) {
    filter = f;
    tabs.forEach(function (t) {
      var on = t.dataset.filter === f;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    list.setAttribute('aria-labelledby', 'tab-' + f);
    render();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      setFilter(t.dataset.filter);
      history.replaceState(null, '', t.dataset.filter === 'all' ? location.pathname : '#' + t.dataset.filter);
    });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (n === null) return;
      e.preventDefault();
      setFilter(tabs[(n + tabs.length) % tabs.length].dataset.filter, true);
    });
  });

  // Details dialog
  var details = document.getElementById('details-dlg');
  function openDetails(c) {
    document.getElementById('details-title').textContent = c.name;
    document.getElementById('details-sub').textContent = c.channels + ' · ' + (c.status === 'active' ? 'Active' : 'Completed');
    document.getElementById('d-spent').textContent = inr(c.spent);
    document.getElementById('d-leads').textContent = c.leads;
    document.getElementById('d-cpl').textContent = c.leads ? inr(Math.round(c.spent / c.leads)) : '—';
    document.getElementById('d-roi').textContent = c.spent || c.leads ? '+' + c.roi + '%' : '—';
    details.showModal();
  }

  // Create dialog
  var dlg = document.getElementById('create-dlg');
  var form = document.getElementById('create-form');
  var nameInput = document.getElementById('c-name');
  document.getElementById('create-btn').addEventListener('click', function () {
    form.reset(); setErr('c-name-error', ''); setErr('c-channel-error', ''); nameInput.removeAttribute('aria-invalid');
    dlg.showModal(); nameInput.focus();
  });
  function setErr(id, msg) { var e = document.getElementById(id); e.textContent = msg; e.style.display = msg ? 'block' : 'none'; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    var picked = Array.prototype.map.call(form.querySelectorAll('input[name="c-channel"]:checked'), function (i) { return i.value; });
    if (!name) { nameInput.setAttribute('aria-invalid', 'true'); setErr('c-name-error', 'Enter a campaign name.'); nameInput.focus(); return; }
    nameInput.removeAttribute('aria-invalid'); setErr('c-name-error', '');
    if (!picked.length) { setErr('c-channel-error', 'Choose at least one channel.'); return; }

    var payload = { id: Date.now(), name: name, channels: picked.join(' + '), spent: 0, leads: 0, roi: 0, status: 'active' };

    function saveLocally() {
      custom.unshift(payload);
      try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (err) {}
      render();
    }

    if (!api) {
      saveLocally();
    } else {
      fetch(api + '/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('Save failed');
        return res.json();
      }).then(function (saved) {
        custom.unshift(saved);
        try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (err) {}
        render();
      }).catch(function () {
        saveLocally();
      });
    }

    dlg.close();
    if (window.MarketlyFX) window.MarketlyFX.confetti({ x: .5, y: .5, count: 90 });
    setFilter(filter === 'completed' ? 'active' : filter);
  });

  // Close buttons + click on backdrop
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || (e.target.closest && e.target.closest('[data-close]'))) d.close();
    });
  });

  function fromHash() {
    var h = location.hash.replace('#', '');
    setFilter(h === 'active' || h === 'completed' ? h : 'all');
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  loadBackendCampaigns();
})();
