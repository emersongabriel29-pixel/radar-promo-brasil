document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    const error = document.getElementById('error');
    button.disabled = true;
    error.textContent = '';

    try {
      const response = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: document.getElementById('password').value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
      window.location.href = '/';
    } catch (exception) {
      error.textContent = exception.message || 'Não foi possível entrar.';
    } finally {
      button.disabled = false;
    }
  });
});
