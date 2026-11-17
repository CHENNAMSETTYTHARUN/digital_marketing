// Login form: validation + show/hide password
(function () {
  var form = document.getElementById('login-form');
  if (!form) return;
  var email = document.getElementById('email');
  var password = document.getElementById('password');
  var status = document.getElementById('form-status');
  var toggle = document.getElementById('toggle-pw');

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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.classList.remove('show');
    var r = validate();
    if (!r.emailOk) { email.focus(); return; }
    if (!r.pwOk) { password.focus(); return; }

    status.textContent = 'Signing you in…';
    status.classList.add('show');
    fetch((window.MARKETLY_API_BASE || 'http://127.0.0.1:8000') + '/api/v1/auth/login', {
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
      status.textContent = err instanceof TypeError
        ? 'Can’t connect to the Stackly API. Make sure the backend is running, then reload this page.'
        : (err.message || 'Unable to complete sign-in. Please try again.');
      status.classList.add('show');
    });
  });

  [email, password].forEach(function (el) {
    el.addEventListener('input', function () { if (el.hasAttribute('aria-invalid')) validate(); });
  });
})();
