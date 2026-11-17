// Dashboard: time-based greeting + signed-in name
(function () {
  var h = new Date().getHours();
  var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  var greeting = document.getElementById('greeting');
  if (greeting) greeting.textContent = greet;
  var userName = document.getElementById('user-name');
  if (!userName) return;

  function updateNav(fullName) {
    if (!fullName) return;
    userName.textContent = fullName;
    var navName = document.querySelector('.nav-actions .session-user, .nav-actions a.login');
    if (navName) {
      navName.textContent = fullName;
      navName.setAttribute('aria-label', 'Signed in as ' + fullName + '. Open dashboard.');
    }
  }

  try {
    var name = JSON.parse(sessionStorage.getItem('marketly_name'));
    if (name) updateNav(name);
  } catch (e) {}

  var token = '';
  try { token = sessionStorage.getItem('marketly_access_token') || ''; } catch (e) {}
  if (!token || token.indexOf('client_token_') === 0) return;

  var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
  if (!apiBase) return;

  fetch(apiBase + '/api/v1/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }, credentials: 'include'
  }).then(function (response) {
    if (!response.ok) return null;
    return response.json();
  }).then(function (user) {
    if (!user || !user.full_name) return;
    updateNav(user.full_name);
    sessionStorage.setItem('marketly_name', JSON.stringify(user.full_name));
  }).catch(function () {});
})();
