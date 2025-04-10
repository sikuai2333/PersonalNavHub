class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        this.createAuthModal();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-content">
                <h2>用户登录</h2>
                <div class="auth-form login-form">
                    <input type="text" id="loginUsername" placeholder="用户名">
                    <input type="password" id="loginPassword" placeholder="密码">
                    <button id="loginButton">登录</button>
                    <p class="switch-form">没有账号？<a href="#" id="showRegister">立即注册</a></p>
                </div>
                <div class="auth-form register-form" style="display: none;">
                    <input type="text" id="registerUsername" placeholder="用户名">
                    <input type="password" id="registerPassword" placeholder="密码">
                    <input type="password" id="confirmPassword" placeholder="确认密码">
                    <button id="registerButton">注册</button>
                    <p class="switch-form">已有账号？<a href="#" id="showLogin">立即登录</a></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setupEventListeners() {
        document.getElementById('loginButton').addEventListener('click', () => this.login());
        document.getElementById('registerButton').addEventListener('click', () => this.register());
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleForms('register');
        });
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleForms('login');
        });
    }

    toggleForms(form) {
        const loginForm = document.querySelector('.login-form');
        const registerForm = document.querySelector('.register-form');
        if (form === 'register') {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        } else {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        }
    }

    async login() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showError('请输入用户名和密码');
            return;
        }

        try {
            const response = await fetch(`${window.appConfig.apiBaseUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '登录失败');
            }

            this.token = data.token;
            localStorage.setItem('token', this.token);
            document.getElementById('authModal').style.display = 'none';
            window.location.reload();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async register() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || !password || !confirmPassword) {
            this.showError('请填写所有字段');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('两次输入的密码不一致');
            return;
        }

        try {
            const response = await fetch(`${window.appConfig.apiBaseUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '注册失败');
            }

            this.showSuccess('注册成功，请登录');
            this.toggleForms('login');
        } catch (error) {
            this.showError(error.message);
        }
    }

    checkAuthStatus() {
        if (!this.token) {
            document.getElementById('authModal').style.display = 'block';
        } else {
            this.createLogoutButton();
        }
    }

    createLogoutButton() {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutButton';
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = '退出登录';
        logoutBtn.addEventListener('click', () => this.logout());
        document.body.insertBefore(logoutBtn, document.body.firstChild);
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        window.location.reload();
    }

    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'auth-error';
        errorEl.textContent = message;
        document.querySelector('.auth-content').appendChild(errorEl);
        setTimeout(() => errorEl.remove(), 3000);
    }

    showSuccess(message) {
        const successEl = document.createElement('div');
        successEl.className = 'auth-success';
        successEl.textContent = message;
        document.querySelector('.auth-content').appendChild(successEl);
        setTimeout(() => successEl.remove(), 3000);
    }
}

// 初始化认证管理器
new AuthManager();