function cookies(force) {
  try {
    if (force || !localStorage.getItem('rpb_cookie_choice')) {
      document.getElementById('cookie')?.classList.add('on');
    }
  } catch {
    if (force) document.getElementById('cookie')?.classList.add('on');
  }
}

function saveCookies(value) {
  try {
    localStorage.setItem('rpb_cookie_choice', value);
  } catch {
    // O painel continua utilizável mesmo quando o armazenamento está indisponível.
  }
  document.getElementById('cookie')?.classList.remove('on');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-cookie-open]')?.addEventListener('click', () => cookies(true));
  document.querySelectorAll('[data-cookie-choice]').forEach((button) => {
    button.addEventListener('click', () => saveCookies(button.dataset.cookieChoice));
  });
  cookies(false);
});
