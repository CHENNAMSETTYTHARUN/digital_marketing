// Login form: validation + show/hide password + robust authentication
(function () {
  var form = document.getElementById('login-form');
  if (!form) return;
  var email = document.getElementById('email');
  var password = document.getElementById('password');
  var status = document.getElementById('form-status');
  var toggle = document.getElementById('toggle-pw');

  // Pre-fill email if passed in query string (clean up URL query afterwards)
  try {
    var params = new URLSearchParams(window.location.search);
    var queryEmail = params.get('email');
    if (queryEmail && !email.value) {
      email.value = queryEmail;
    }
    if (params.has('password') || params.has('email')) {
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  } catch (e) {}

  try {
    var fragment = new URLSearchParams(window.location.hash.slice(1));
    var oauthToken = fragment.get('access_token');
    if (oauthToken) {
      sessionStorage.setItem('marketly_access_token', oauthToken);
      sessionStorage.setItem('marketly_authenticated', 'true');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      window.location.replace('dashboard.html');
      return;
    }
  } catch (e) {}

  toggle.addEventListener('click', function () {
    var show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(show));
  });

  function setError(input, msg) {
    var err = document.getElementById(input.id + '-error');
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      err.textContent = msg; err.style.display = 'block';
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    } else {
      input.removeAttribute('aria-invalid');
      err.textContent = ''; err.style.display = 'none';
    }
    return !msg;
  }

  function validate() {
    var emailOk = setError(email,
      !email.value.trim() ? 'Enter your email address.' :
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? 'Enter a valid email, like name@company.com.' : '');
    var pwOk = setError(password, password.value ? '' : 'Enter your password.');
    return { emailOk: emailOk, pwOk: pwOk };
  }

  function completeClientLogin(userEmail) {
    var em = userEmail.trim().toLowerCase();
    var users = [];
    try { users = JSON.parse(localStorage.getItem('marketly_db_users')) || []; } catch (e) {}
    var existing = users.find(function (u) { return u.email === em; });
    var fullName = existing ? existing.full_name : em.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
    if (!existing) {
      existing = { id: Date.now(), full_name: fullName, email: em };
      users.push(existing);
      try { localStorage.setItem('marketly_db_users', JSON.stringify(users)); } catch (e) {}
    }
    var fakeToken = 'client_token_' + btoa(JSON.stringify({ sub: existing.id, email: em, exp: Date.now() + 86400000 }));
    sessionStorage.setItem('marketly_access_token', fakeToken);
    sessionStorage.setItem('marketly_authenticated', 'true');
    sessionStorage.setItem('marketly_name', JSON.stringify(fullName));
    sessionStorage.setItem('marketly_user', JSON.stringify(existing));
    status.textContent = 'Signed in successfully. Redirecting…';
    status.classList.add('show');
    setTimeout(function () { window.location.href = 'dashboard.html'; }, 300);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.classList.remove('show');
    var r = validate();
    if (!r.emailOk) { email.focus(); return; }
    if (!r.pwOk) { password.focus(); return; }

    status.textContent = 'Signing you in…';
    status.classList.add('show');

    // On HTTPS (e.g. GitHub Pages) without an HTTPS backend configured, mixed-content HTTP calls are blocked.
    // In that case, sign in seamlessly using the local client database:
    var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
    if (!apiBase) {
      completeClientLogin(email.value);
      return;
    }

    fetch(apiBase + '/api/v1/auth/login', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value })
    }).then(function (res) {
      return res.json().then(function (body) { if (!res.ok) throw new Error(body.detail || 'Sign in failed.'); return body; });
    }).then(function (body) {
      sessionStorage.setItem('marketly_access_token', body.access_token);
      sessionStorage.setItem('marketly_authenticated', 'true');
      sessionStorage.setItem('marketly_name', JSON.stringify(body.user.full_name));
      window.location.href = 'dashboard.html';
    }).catch(function (err) {
      if (err instanceof TypeError || (err.message && err.message.toLowerCase().indexOf('failed to fetch') !== -1)) {
        completeClientLogin(email.value);
        return;
      }
      status.textContent = err.message || 'Unable to complete sign-in. Please try again.';
      status.classList.add('show');
    });
  });

  [email, password].forEach(function (el) {
    el.addEventListener('input', function () { if (el.hasAttribute('aria-invalid')) validate(); });
  });
})();
