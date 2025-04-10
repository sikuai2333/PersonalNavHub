class NavigationManager {
    constructor() {
        this.errorTimeout = null;
        this.links = [];
        this.token = localStorage.getItem('token');
        this.init();
    }

    async init() {
        if (this.token) {
            await this.fetchLinks();
        }
        this.renderLinks();
        this.setupEventListeners();
    }

    renderLinks() {
        const container = document.getElementById('linksContainer');
        container.innerHTML = '';
        
        this.links.forEach((link) => {
            const linkCard = document.createElement('div');
            linkCard.className = 'link-card';
            linkCard.innerHTML = `
                <a href="${link.url}" target="_blank">${link.name}</a>
            `;
            container.appendChild(linkCard);
        });
        
        this.renderManagerLinks();
        // 移除不存在的方法调用
    }

    renderManagerLinks() {
        const manager = document.getElementById('linksManager');
        if (!manager) return;
        
        manager.innerHTML = '';
        this.links.forEach((link, index) => {
            const linkItem = document.createElement('div');
            linkItem.className = 'link-item';
            linkItem.innerHTML = `
                <span>${link.name} - ${link.url}</span>
                <button class="delete-btn" data-index="${index}">删除</button>
            `;
            manager.appendChild(linkItem);
        });
    }

    setupEventListeners() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettings = document.getElementById('closeSettings');

        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'block';
            // 触发重排后添加可见类名以启动动画
            setTimeout(() => settingsModal.classList.add('visible'), 10);
            this.renderManagerLinks();
        });

        closeSettings.addEventListener('click', () => this.closeModal());

        // 添加ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && settingsModal.style.display === 'block') {
                this.closeModal();
            }
        });

        document.getElementById('addLink').addEventListener('click', () => {
            const nameInput = document.getElementById('siteName');
            const urlInput = document.getElementById('siteUrl');
            
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            
            if (name && url) {
                this.addLink(name, url);
                nameInput.value = '';
                urlInput.value = '';
            } else {
                this.showError('请输入网站名称和地址！');
            }
        });

        document.getElementById('linksManager').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const index = parseInt(e.target.dataset.index);
                this.deleteLink(index);
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeModal();
            }
        });
    }

    async addLink(name, url) {
        if (!this.token) {
            this.showError('请先登录');
            return;
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        await this.saveLink(name, url);
    }

    async deleteLink(index) {
        if (!this.token) {
            this.showError('请先登录');
            return;
        }
        const link = this.links[index];
        try {
            const response = await fetch(`${window.appConfig.apiBaseUrl}/api/links/${link.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            if (!response.ok) {
                throw new Error('删除链接失败');
            }
            this.links.splice(index, 1);
            this.renderLinks();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async fetchLinks() {
        try {
            const response = await fetch(`${window.appConfig.apiBaseUrl}/api/links`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            if (!response.ok) {
                throw new Error('获取链接失败');
            }
            this.links = await response.json();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async saveLink(name, url) {
        try {
            const response = await fetch(`${window.appConfig.apiBaseUrl}/api/links`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, url })
            });
            if (!response.ok) {
                throw new Error('添加链接失败');
            }
            const newLink = await response.json();
            this.links.push(newLink);
            this.renderLinks();
        } catch (error) {
            this.showError(error.message);
        }
    }

    closeModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    showError(message) {
        // 清除之前的错误提示
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
        }
        
        // 创建或更新错误提示元素
        let errorEl = document.getElementById('errorMessage');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'errorMessage';
            errorEl.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: #d93025;
                color: white;
                padding: 12px 24px;
                border-radius: 4px;
                font-size: 14px;
                box-shadow: var(--shadow-2);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(errorEl);
        }

        errorEl.textContent = message;
        errorEl.style.opacity = '1';

        // 3秒后隐藏错误提示
        this.errorTimeout = setTimeout(() => {
            errorEl.style.opacity = '0';
            setTimeout(() => errorEl.remove(), 300);
        }, 3000);
    }
}

// 初始化导航管理器
new NavigationManager();