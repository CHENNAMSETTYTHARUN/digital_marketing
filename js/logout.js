(function () {
  var button = document.getElementById('logout-button');
  if (!button || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', function () {
    var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
    function clearAndExit() {
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

    if (!apiBase) {
      clearAndExit();
      return;
    }

    fetch(apiBase + '/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
      .catch(function () {})
      .finally(clearAndExit);
  });
})();
