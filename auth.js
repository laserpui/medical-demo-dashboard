const MASTER_PASSWORD = '026161082';
const ALLOWED_EMAILS = [
  'laserpui@gmail.com',
  'lasersu@gmail.com',
  'laserat@gmail.com',
  'laservj@gmail.com',
  'lasernok@gmail.com',
  'laseraea@gmail.com'
];

document.addEventListener('DOMContentLoaded', initAuth);

function initAuth() {
  const overlay = document.getElementById('loginOverlay');
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  const togglePassword = document.getElementById('togglePassword');

  const resetError = () => {
    loginError.classList.add('hidden');
    emailInput.closest('.login-input').classList.remove('invalid');
    passwordInput.closest('.login-input').classList.remove('invalid');
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();
    if (ALLOWED_EMAILS.includes(email) && password === MASTER_PASSWORD) {
      sessionStorage.setItem('dashboard_authorized', 'true');
      overlay.classList.add('authorized');
      setTimeout(startApplication, 220);
      return;
    }
    loginError.classList.remove('hidden');
    emailInput.closest('.login-input').classList.add('invalid');
    passwordInput.closest('.login-input').classList.add('invalid');
    passwordInput.select();
  });

  emailInput.addEventListener('input', resetError);
  passwordInput.addEventListener('input', resetError);
  togglePassword.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePassword.innerHTML = `<i class="ph ph-eye${show ? '-slash' : ''}"></i>`;
    passwordInput.focus();
  });

  if (sessionStorage.getItem('dashboard_authorized') === 'true') {
    overlay.classList.add('authorized');
    startApplication();
  } else {
    document.getElementById('loadingScreen').classList.add('done');
    setTimeout(() => emailInput.focus(), 80);
  }
}

let applicationStarted = false;
function startApplication() {
  if (applicationStarted) return;
  applicationStarted = true;
  const script = document.createElement('script');
  script.src = 'app.js';
  script.onload = () => {
    installTwoProductSearches();
    init();
  };
  script.onerror = () => {
    applicationStarted = false;
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = 'ไม่สามารถเริ่มระบบได้ กรุณารีเฟรชหน้าเว็บ';
    document.getElementById('loadingScreen').classList.remove('done');
  };
  document.body.appendChild(script);
}

function installTwoProductSearches() {
  const first = document.getElementById('productSearch1');
  const second = document.getElementById('productSearch2');
  const reset = document.getElementById('resetProductSearch');
  let timer;

  filterProducts = function () {
    const term1 = first.value.trim().toLowerCase();
    const term2 = second.value.trim().toLowerCase();
    state.productFiltered = state.products.filter(row => {
      const cells = row.map(cell => String(cell || '').toLowerCase());
      const matchesFirst = !term1 || cells.some(cell => cell.includes(term1));
      const matchesSecond = !term2 || cells.some(cell => cell.includes(term2));
      return matchesFirst && matchesSecond;
    });
    state.productPage = 1;
    renderProducts();
  };

  const handleSearch = () => {
    clearTimeout(timer);
    timer = setTimeout(filterProducts, 160);
  };
  first.addEventListener('input', handleSearch);
  second.addEventListener('input', handleSearch);
  reset.addEventListener('click', () => {
    clearTimeout(timer);
    first.value = '';
    second.value = '';
    filterProducts();
    first.focus();
  });
}
