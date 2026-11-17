// Restrict dashboard access to visitors who have signed in during this session.
(function () {
  var token = '';
  try {
    token = localStorage.getItem('marketly_access_token') || sessionStorage.getItem('marketly_access_token') || '';
  } catch (e) {}
  var isAuth = false;
  try {
    isAuth = (localStorage.getItem('marketly_authenticated') === 'true' || sessionStorage.getItem('marketly_authenticated') === 'true') && Boolean(token);
  } catch (e) {}

  if (!token || !isAuth) {
    window.location.replace('login.html');
    return;
  }

  // Ensure both storages stay synchronized
  try {
    localStorage.setItem('marketly_access_token', token);
    sessionStorage.setItem('marketly_access_token', token);
    localStorage.setItem('marketly_authenticated', 'true');
    sessionStorage.setItem('marketly_authenticated', 'true');
  } catch (e) {}

  // Client demo tokens are valid locally
  if (token.indexOf('client_token_') === 0) {
    return;
  }

  var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
  if (!apiBase) {
    return;
  }
  var api = apiBase + '/api/v1';

  function validate(value) {
    return fetch(api + '/auth/me', { headers: { 'Authorization': 'Bearer ' + value }, credentials: 'include' });
  }

  validate(token).then(function (response) {
    if (response.status !== 401) {
      if (!response.ok) throw new Error('Session unavailable');
      return;
    }
    return fetch(api + '/auth/refresh', { method: 'POST', credentials: 'include' }).then(function (refreshed) {
      if (!refreshed.ok) throw new Error('Session expired');
      return refreshed.json();
    }).then(function (body) {
      try {
        localStorage.setItem('marketly_access_token', body.access_token);
        sessionStorage.setItem('marketly_access_token', body.access_token);
      } catch (e) {}
      return validate(body.access_token).then(function (checked) { if (!checked.ok) throw new Error('Session expired'); });
    });
  }).catch(function (err) {
    // Only kick the user out if backend explicitly rejected with 401/expired, not on network/offline errors
    if (err && err.message && err.message.indexOf('Session expired') !== -1) {
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
      window.location.replace('login.html');
    }
  });
})();
