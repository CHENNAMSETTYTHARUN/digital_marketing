// Dashboard: time-based greeting + signed-in name
(function () {
  var h = new Date().getHours();
  var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  var greeting = document.getElementById('greeting');
  if (greeting) greeting.textContent = greet;
  var userName = document.getElementById('user-name');
  if (!userName) return;
  try {
    var name = JSON.parse(sessionStorage.getItem('marketly_name'));
    if (name) userName.textContent = name;
  } catch (e) {}
  var token = '';
  try { token = sessionStorage.getItem('marketly_access_token') || ''; } catch (e) {}
  if (!token) return;
  fetch((window.MARKETLY_API_BASE || 'http://127.0.0.1:8000') + '/api/v1/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }, credentials: 'include'
  }).then(function (response) {
    if (!response.ok) return null;
    return response.json();
  }).then(function (user) {
    if (!user || !user.full_name) return;
    userName.textContent = user.full_name;
    sessionStorage.setItem('marketly_name', JSON.stringify(user.full_name));
    var navName = document.querySelector('.nav-actions .session-user, .nav-actions a.login');
    if (navName) {
      navName.textContent = user.full_name;
      navName.setAttribute('aria-label', 'Signed in as ' + user.full_name + '. Open dashboard.');
    }
  }).catch(function () {});
})();
