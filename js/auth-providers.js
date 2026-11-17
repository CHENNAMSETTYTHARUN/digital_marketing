(function () {
  var buttons = {
    google: document.getElementById('google-login'),
    microsoft: document.getElementById('microsoft-login')
  };
  var status = document.getElementById('provider-status');
  if (!status) return;

  var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
  var api = apiBase ? (apiBase + '/api/v1') : '';

  function saveLocalDemo(provider, identity) {
    var fakeToken = 'client_token_' + btoa(JSON.stringify({ sub: provider + '_demo_' + Date.now(), email: identity.email, exp: Date.now() + 86400000 }));
    sessionStorage.setItem('marketly_access_token', fakeToken);
    sessionStorage.setItem('marketly_authenticated', 'true');
    sessionStorage.setItem('marketly_name', JSON.stringify(identity.full_name));
    sessionStorage.setItem('marketly_user', JSON.stringify({ id: Date.now(), full_name: identity.full_name, email: identity.email, auth_provider: provider }));
    status.textContent = 'Signed in with ' + (provider === 'google' ? 'Google' : 'Microsoft') + '. Redirecting…';
    status.classList.add('show');
    setTimeout(function () { window.location.assign('dashboard.html'); }, 300);
  }

  function finishDemoSignIn(provider, identity) {
    status.textContent = 'Continuing with ' + (provider === 'google' ? 'Google' : 'Microsoft') + '…';
    status.classList.add('show');

    if (!api) {
      saveLocalDemo(provider, identity);
      return;
    }

    fetch(api + '/auth/demo/' + provider, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identity)
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.detail || 'Demo sign-in failed.');
        return body;
      });
    }).then(function (body) {
      sessionStorage.setItem('marketly_access_token', body.access_token);
      sessionStorage.setItem('marketly_authenticated', 'true');
      sessionStorage.setItem('marketly_name', JSON.stringify(body.user.full_name));
      window.location.assign('dashboard.html');
    }).catch(function (error) {
      if (error instanceof TypeError || (error.message && error.message.toLowerCase().indexOf('failed to fetch') !== -1)) {
        saveLocalDemo(provider, identity);
        return;
      }
      var message = document.getElementById('demo-auth-message');
      if (message) message.textContent = error.message || 'Demo sign-in failed.';
      status.textContent = error.message || 'Demo sign-in failed.';
      status.classList.add('show');
    });
  }

  function openDemoChooser(provider) {
    var label = provider === 'google' ? 'Google' : 'Microsoft';
    var demoName = provider === 'google' ? 'Google User' : 'Microsoft User';
    var demoEmail = provider === 'google' ? 'google.user@example.com' : 'microsoft.user@example.com';
    var overlay = document.createElement('div');
    overlay.className = 'demo-auth-overlay';
    overlay.innerHTML = '<section class="demo-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-auth-title">' +
      '<button class="demo-auth-close" type="button" aria-label="Close">×</button>' +
      '<div class="demo-auth-brand">' + (provider === 'google' ? '<span class="provider-mark google-mark">G</span>' : '<span class="provider-mark microsoft-mark"><i></i><i></i><i></i><i></i></span>') +
      '<span>' + label + '</span></div>' +
      '<h2 id="demo-auth-title">Sign in with ' + label + '</h2>' +
      '<p class="demo-auth-intro">Choose an account or sign in to continue.</p>' +
      '<button class="demo-account-choice" type="button"><span class="demo-avatar">' + demoName.charAt(0) + '</span><span><strong>' + demoName + '</strong><small>' + demoEmail + '</small></span><span class="demo-chevron">›</span></button>' +
      '<button class="demo-use-another" type="button">Use another ' + label + ' account</button>' +
      '<form class="demo-other-form" hidden><label for="demo-account-name">Full name</label><input id="demo-account-name" name="full_name" autocomplete="name" required minlength="2" maxlength="120"><label for="demo-account-email">Email (e.g. user@example.com)</label><input id="demo-account-email" name="email" type="email" autocomplete="email" required><button class="btn btn-dark" type="submit">Continue with ' + label + '</button></form>' +
      '<p class="demo-auth-message" id="demo-auth-message" role="status" aria-live="polite"></p></section>';
    document.body.appendChild(overlay);
    var close = overlay.querySelector('.demo-auth-close');
    var choice = overlay.querySelector('.demo-account-choice');
    var another = overlay.querySelector('.demo-use-another');
    var form = overlay.querySelector('.demo-other-form');
    close.addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.remove(); });
    choice.addEventListener('click', function () { finishDemoSignIn(provider, { full_name: demoName, email: demoEmail }); });
    another.addEventListener('click', function () { form.hidden = false; another.hidden = true; form.querySelector('input').focus(); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      finishDemoSignIn(provider, { full_name: form.elements.full_name.value.trim(), email: form.elements.email.value.trim() });
    });
    close.focus();
  }

  Object.keys(buttons).forEach(function (provider) {
    var button = buttons[provider];
    if (!button) return;
    button.addEventListener('click', function () {
      status.textContent = 'Checking ' + (provider === 'google' ? 'Google' : 'Microsoft') + ' sign-in…';
      status.classList.add('show');

      if (!api) {
        openDemoChooser(provider);
        status.classList.remove('show');
        return;
      }

      fetch(api + '/auth/providers').then(function (response) {
        if (!response.ok) throw new Error('Could not reach the sign-in service.');
        return response.json();
      }).then(function (providers) {
        if (!providers[provider]) {
          if (providers.demo_oauth) { openDemoChooser(provider); status.classList.remove('show'); return; }
          var providerName = provider === 'google' ? 'Google' : 'Microsoft';
          var setting = provider === 'google' ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET' : 'MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET';
          throw new Error(providerName + ' sign-in needs OAuth setup. Add ' + setting + ' to backend/.env; then the provider will show its account chooser and an option to use another account.');
        }
        window.location.assign(api + '/auth/' + provider);
      }).catch(function (error) {
        if (error instanceof TypeError || (error.message && error.message.toLowerCase().indexOf('failed to fetch') !== -1)) {
          openDemoChooser(provider);
          status.classList.remove('show');
          return;
        }
        status.textContent = error.message || 'Unable to start social sign-in.';
        status.classList.add('show');
      });
    });
  });
})();
