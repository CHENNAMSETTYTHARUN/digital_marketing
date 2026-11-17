(function () {
  var form = document.getElementById('feedback-form');
  if (!form) return;
  var status = document.getElementById('feedback-status');
  var submit = form.querySelector('button[type="submit"]');

  var apiBase = window.MARKETLY_API_BASE || (location.protocol === 'https:' ? '' : 'http://127.0.0.1:8000');
  var api = apiBase ? (apiBase + '/api/v1/feedback') : '';

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.className = 'feedback-status';
    if (!form.reportValidity()) return;

    var rating = form.elements.rating.value;
    var payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value.trim(),
      message: form.elements.message.value.trim(),
      rating: rating ? Number(rating) : null
    };
    if (payload.name.length < 2 || payload.subject.length < 3 || payload.message.length < 10) {
      status.textContent = 'Please enter a name, subject, and message with a little more detail.';
      status.classList.add('show', 'error');
      return;
    }

    function saveLocally() {
      var fb = [];
      try { fb = JSON.parse(localStorage.getItem('marketly_feedback')) || []; } catch (e) {}
      fb.push(Object.assign({ id: Date.now(), created_at: new Date().toISOString() }, payload));
      try { localStorage.setItem('marketly_feedback', JSON.stringify(fb)); } catch (e) {}
      form.reset();
      status.textContent = 'Thanks for your feedback. It was saved successfully.';
      status.classList.add('show', 'success');
      submit.disabled = false;
      submit.textContent = 'Send Feedback';
    }

    if (!api) {
      saveLocally();
      return;
    }

    var headers = { 'Content-Type': 'application/json' };
    try {
      var token = localStorage.getItem('marketly_access_token') || sessionStorage.getItem('marketly_access_token');
      if (token) headers.Authorization = 'Bearer ' + token;
    } catch (e) {}
    submit.disabled = true;
    submit.textContent = 'Sending…';

    fetch(api, { method: 'POST', credentials: 'include', headers: headers, body: JSON.stringify(payload) })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) {
            var detail = body.detail;
            if (Array.isArray(detail)) detail = detail.map(function (item) { return item.msg; }).join(' ');
            throw new Error(detail || 'Your feedback could not be saved. Please try again.');
          }
          return body;
        });
      }).then(function (body) {
        form.reset();
        status.textContent = body.message || 'Thanks for your feedback. It was saved successfully.';
        status.classList.add('show', 'success');
      }).catch(function (error) {
        if (error instanceof TypeError || (error.message && error.message.toLowerCase().indexOf('failed to fetch') !== -1)) {
          saveLocally();
          return;
        }
        status.textContent = error.message || 'Your feedback could not be saved. Please try again.';
        status.classList.add('show', 'error');
      }).finally(function () {
        submit.disabled = false;
        submit.textContent = 'Send Feedback';
      });
  });
})();
