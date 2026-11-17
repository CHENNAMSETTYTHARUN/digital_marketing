(function () {
  var form = document.getElementById('signup-form');
  if (!form) return;
  var name = document.getElementById('full-name');
  var email = document.getElementById('signup-email');
  var password = document.getElementById('signup-password');
  var confirmPassword = document.getElementById('confirm-password');
  var status = document.getElementById('signup-status');

  var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
  var api = apiBase ? (apiBase + '/api/v1') : '';

  function saveSession(token, fullName, user) {
    try {
      if (token) {
        localStorage.setItem('marketly_access_token', token);
        sessionStorage.setItem('marketly_access_token', token);
      }
      localStorage.setItem('marketly_authenticated', 'true');
      sessionStorage.setItem('marketly_authenticated', 'true');
      if (fullName) {
        localStorage.setItem('marketly_name', JSON.stringify(fullName));
        sessionStorage.setItem('marketly_name', JSON.stringify(fullName));
      }
      if (user) {
        localStorage.setItem('marketly_user', JSON.stringify(user));
        sessionStorage.setItem('marketly_user', JSON.stringify(user));
      }
    } catch (e) {}
  }

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

  function completeClientSignup(fullName, userEmail) {
    var em = userEmail.trim().toLowerCase();
    var fn = fullName.trim();
    var users = [];
    try { users = JSON.parse(localStorage.getItem('marketly_db_users')) || []; } catch (e) {}
    var user = { id: Date.now(), full_name: fn, email: em };
    users.push(user);
    try { localStorage.setItem('marketly_db_users', JSON.stringify(users)); } catch (e) {}
    var fakeToken = 'client_token_' + btoa(JSON.stringify({ sub: user.id, email: em, exp: Date.now() + 86400000 }));
    saveSession(fakeToken, fn, user);
    status.textContent = 'Account created. Signing you in…';
    setTimeout(function () { window.location.href = 'onboarding.html'; }, 300);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.classList.remove('show');
    if (!validate()) return;
    status.textContent = 'Creating your account…';
    status.classList.add('show');

    if (!api) {
      completeClientSignup(name.value, email.value);
      return;
    }

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
      saveSession(body.access_token, body.user.full_name, body.user);
      window.location.href = 'onboarding.html';
    }).catch(function (error) {
      if (error instanceof TypeError || (error.message && error.message.toLowerCase().indexOf('failed to fetch') !== -1)) {
        completeClientSignup(name.value, email.value);
        return;
      }
      status.textContent = error.message || 'Unable to complete sign-up. Please try again.';
      status.classList.add('show');
    });
  });

  [name, email, password, confirmPassword].forEach(function (input) {
    input.addEventListener('input', function () { if (input.hasAttribute('aria-invalid')) validate(); });
  });
})();
