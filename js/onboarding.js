// Onboarding: step 1 (business) -> step 2 (channels) -> dashboard
(function () {
  var step1 = document.getElementById('step1');
  var step2 = document.getElementById('step2');
  var business = document.getElementById('business');
  var channels = document.getElementById('channels');

  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function checked(name) {
    return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
  }
  function show(id, msg) {
    var el = document.getElementById(id);
    el.textContent = msg || ''; el.classList.toggle('show', !!msg);
    if (id === 'business-error') el.style.display = msg ? 'block' : 'none';
  }

  step1.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = business.value.trim();
    var goals = checked('goal');
    if (!name) {
      business.setAttribute('aria-invalid', 'true');
      show('business-error', 'Enter your business name.');
      business.focus(); return;
    }
    business.removeAttribute('aria-invalid'); show('business-error', '');
    if (!goals.length) { show('goal-error', 'Choose at least one thing to improve.'); return; }
    show('goal-error', '');

    save('marketly_business', name);
    save('marketly_goals', goals);

    channels.disabled = false;
    step2.classList.remove('is-locked');
    document.getElementById('step2-title').focus();
    step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  business.addEventListener('input', function () {
    if (business.value.trim()) { business.removeAttribute('aria-invalid'); show('business-error', ''); }
  });

  step2.addEventListener('submit', function (e) {
    e.preventDefault();
    var picked = checked('channel');
    if (!picked.length) { show('channel-error', 'Choose at least one channel to connect.'); return; }
    show('channel-error', '');
    save('marketly_channels', picked);
    var api = (window.MARKETLY_API_BASE || 'http://127.0.0.1:8000') + '/api/v1';
    var headers = { 'Content-Type': 'application/json' };
    try {
      var token = sessionStorage.getItem('marketly_access_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } catch (e) {}

    var bizName = '';
    var goals = [];
    try { bizName = JSON.parse(localStorage.getItem('marketly_business')) || ''; } catch (e) {}
    try { goals = JSON.parse(localStorage.getItem('marketly_goals')) || []; } catch (e) {}

    fetch(api + '/onboarding', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify({ business_name: bizName, goals: goals, channels: picked })
    }).catch(function () {}).finally(function () {
      if (window.MarketlyFX) {
        window.MarketlyFX.confetti({ x: .5, y: .7, count: 170 });
        setTimeout(function () { window.location.href = 'dashboard.html'; }, 1100);
      } else { window.location.href = 'dashboard.html'; }
    });
  });
})();
