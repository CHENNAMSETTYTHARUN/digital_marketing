(function () {
  var form = document.getElementById('signup-form');
  if (!form) return;
  var name = document.getElementById('full-name');
  var email = document.getElementById('signup-email');
  var password = document.getElementById('signup-password');
  var confirmPassword = document.getElementById('confirm-password');
  var status = document.getElementById('signup-status');
  var api = (window.MARKETLY_API_BASE || 'http://127.0.0.1:8000') + '/api/v1';

  document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = document.getElementById(button.getAttribute('data-toggle-password'));
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(show));
    });
  });

  function setError(input, message) {
    var error = document.getElementById(input.id + '-error');
    input.toggleAttribute('aria-invalid', Boolean(message));
    error.textContent = message || '';
    error.style.display = message ? 'block' : 'none';
    return !message;
  }

  function validate() {
    var nameOk = setError(name, name.value.trim().length < 2 ? 'Enter your full name.' : '');
    var emailOk = setError(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? 'Enter a valid email address.' : '');
    var pwOk = setError(password, password.value.length < 12 ? 'Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol.' : '');
    var confirmOk = setError(confirmPassword, confirmPassword.value !== password.value ? 'Passwords do not match.' : '');
    return nameOk && emailOk && pwOk && confirmOk;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.classList.remove('show');
    if (!validate()) return;
    status.textContent = 'Creating your account…';
    status.classList.add('show');
    fetch(api + '/auth/register', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name.value.trim(), email: email.value.trim(), password: password.value, confirm_password: confirmPassword.value, terms_accepted: true })
    }).then(function (response) {
      return response.json().then(function (body) { if (!response.ok) throw new Error(body.detail || 'Could not create your account.'); return body; });
    }).then(function () {
      status.textContent = 'Account created. Signing you in…';
      return fetch(api + '/auth/login', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), password: password.value })
      });
    }).then(function (response) {
      return response.json().then(function (body) { if (!response.ok) throw new Error(body.detail || 'Account created, but sign-in failed. Please sign in.'); return body; });
    }).then(function (body) {
      sessionStorage.setItem('marketly_access_token', body.access_token);
      sessionStorage.setItem('marketly_authenticated', 'true');
      sessionStorage.setItem('marketly_name', JSON.stringify(body.user.full_name));
      window.location.href = 'onboarding.html';
    }).catch(function (error) {
      status.textContent = error instanceof TypeError
        ? 'Can’t connect to the Stackly API at ' + api + '. Make sure the backend is running, then reload this page.'
        : (error.message || 'Unable to complete sign-up. Please try again.');
      status.classList.add('show');
    });
  });

  [name, email, password, confirmPassword].forEach(function (input) {
    input.addEventListener('input', function () { if (input.hasAttribute('aria-invalid')) validate(); });
  });
})();
