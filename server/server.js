const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 导入配置文件
const config = require('../js/config');

const app = express();
// 从配置文件或环境变量获取端口
const port = process.env.PORT || 3000;

// 配置中间件
app.use(express.json());

// 配置跨域
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    next();
});

// 限制请求速率
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10分钟
    max: 100 // 限制每个IP 10分钟内最多100个请求
});
app.use(limiter);

// 初始化数据库
const db = new sqlite3.Database(path.join(__dirname, 'navigation.db'), (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('数据库连接成功');
        initDatabase();
    }
});

// 创建数据表
function initDatabase() {
    db.serialize(() => {
        // 用户表
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        // 导航链接表
        db.run(`CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    });
}

// JWT密钥 - 从配置文件获取
const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret;

// 中间件：验证JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供认证token' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的token' });
        }
        req.user = user;
        next();
    });
}

// 注册用户
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: '用户名已存在' });
                    }
                    return res.status(500).json({ error: '注册失败' });
                }
                res.json({ message: '注册成功', userId: this.lastID });
            });
    } catch (err) {
        res.status(500).json({ error: '注册失败' });
    }
});

// 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: '登录失败' });
        }
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        try {
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ error: '用户名或密码错误' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
                expiresIn: '24h'
            });

            res.json({ token });
        } catch (err) {
            res.status(500).json({ error: '登录失败' });
        }
    });
});

// 获取用户的导航链接
app.get('/api/links', authenticateToken, (req, res) => {
    db.all('SELECT id, name, url FROM links WHERE user_id = ?',
        [req.user.id],
        (err, links) => {
            if (err) {
                return res.status(500).json({ error: '获取链接失败' });
            }
            res.json(links);
        });
});

// 添加导航链接
app.post('/api/links', authenticateToken, (req, res) => {
    const { name, url } = req.body;

    if (!name || !url) {
        return res.status(400).json({ error: '名称和URL不能为空' });
    }

    db.run('INSERT INTO links (user_id, name, url) VALUES (?, ?, ?)',
        [req.user.id, name, url],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '添加链接失败' });
            }
            res.json({
                id: this.lastID,
                name,
                url
            });
        });
});

// 删除导航链接
app.delete('/api/links/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM links WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '删除链接失败' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '链接不存在或无权限删除' });
            }
            res.json({ message: '删除成功' });
        });
});

// 获取主机名，默认为localhost
const hostname = process.env.HOST || '0.0.0.0';

app.listen(port, hostname, () => {
    const serverUrl = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`;
    console.log(`服务器运行在 ${serverUrl}`);
});