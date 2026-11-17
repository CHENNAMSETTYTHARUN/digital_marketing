(function () {
  var button = document.getElementById('logout-button');
  if (!button || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', function () {
    var api = window.MARKETLY_API_BASE || 'http://127.0.0.1:8000';
    fetch(api + '/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).finally(function () {
      try { sessionStorage.removeItem('marketly_access_token'); sessionStorage.removeItem('marketly_authenticated'); } catch (e) {}
      window.location.replace('login.html');
    });
  });
})();
