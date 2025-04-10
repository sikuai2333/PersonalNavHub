const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cors = require('cors');
const { body, param, validationResult } = require('express-validator');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 导入配置文件（仅用于前端URL，不再用于敏感信息）
const config = require('../js/config');

const app = express();
// 从配置文件或环境变量获取端口
const port = process.env.PORT || 3000;

// 配置中间件
app.use(express.json());

// 配置跨域 - 使用环境变量中的允许源列表
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5500', 'null'];
app.use(cors({
    origin: function(origin, callback) {
        // 允许没有来源的请求（如本地文件、移动应用或Postman）
        if (!origin || origin === 'null') return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS policy violation'), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 限制请求速率 - 更严格的配置以防止暴力攻击
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    standardHeaders: true, // 返回标准的RateLimit头
    legacyHeaders: false, // 禁用X-RateLimit-*头
    message: { error: '请求过于频繁，请稍后再试' }
});

// 对认证路由应用更严格的限制
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 10, // 限制每个IP 1小时内最多10次登录/注册请求
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '认证请求过于频繁，请稍后再试' }
});

// 应用通用限制
app.use(apiLimiter);
// 对认证路由应用特定限制
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// 初始化数据库 - 使用环境变量中的数据库路径
const dbPath = process.env.DB_PATH || 'navigation.db';
const db = new sqlite3.Database(path.join(__dirname, dbPath), (err) => {
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

// JWT密钥 - 从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

// 在生产环境中检查是否设置了强密钥
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'fallback-secret-key-for-development-only') {
    console.error('警告: 在生产环境中使用默认JWT密钥，这是不安全的！');
    console.error('请设置环境变量JWT_SECRET为一个强随机字符串');
}

// 中间件：验证JWT token - 增强安全性
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供认证token' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'token已过期，请重新登录' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ error: '无效的token' });
            } else {
                console.error('Token验证错误:', err);
                return res.status(403).json({ error: '无效的token' });
            }
        }
        req.user = user;
        next();
    });
}

// 注册用户 - 增强输入验证
app.post('/api/register', [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('用户名长度必须在3-30个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线')
        .escape(),
    body('password')
        .isLength({ min: 8 }).withMessage('密码长度必须至少为8个字符')
        .matches(/[A-Z]/).withMessage('密码必须包含至少一个大写字母')
        .matches(/[a-z]/).withMessage('密码必须包含至少一个小写字母')
        .matches(/[0-9]/).withMessage('密码必须包含至少一个数字')
        .matches(/[^A-Za-z0-9]/).withMessage('密码必须包含至少一个特殊字符')
], async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    try {
        // 使用更高的成本因子增强安全性
        const hashedPassword = await bcrypt.hash(password, 12);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: '用户名已存在' });
                    }
                    // 不暴露具体错误信息
                    console.error('注册失败:', err);
                    return res.status(500).json({ error: '注册失败，请稍后再试' });
                }
                res.json({ message: '注册成功', userId: this.lastID });
            });
    } catch (err) {
        console.error('密码哈希失败:', err);
        res.status(500).json({ error: '注册失败，请稍后再试' });
    }
});

// 用户登录 - 增强输入验证和安全性
app.post('/api/login', [
    body('username').trim().escape(),
    body('password').isLength({ min: 1 })
], (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('登录查询失败:', err);
            return res.status(500).json({ error: '登录失败，请稍后再试' });
        }
        if (!user) {
            // 使用固定时间比较防止计时攻击
            await bcrypt.compare('dummy-password', '$2b$12$123456789012345678901234567890123456789012345678');
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        try {
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ error: '用户名或密码错误' });
            }

            // 生成JWT令牌，不包含敏感信息
            const token = jwt.sign({ 
                id: user.id, 
                username: user.username 
            }, JWT_SECRET, {
                expiresIn: '24h',
                algorithm: 'HS256' // 明确指定算法
            });

            res.json({ token });
        } catch (err) {
            console.error('密码验证失败:', err);
            res.status(500).json({ error: '登录失败，请稍后再试' });
        }
    });
});

// 获取用户的导航链接
app.get('/api/links', authenticateToken, (req, res) => {
    db.all('SELECT id, name, url FROM links WHERE user_id = ?',
        [req.user.id],
        (err, links) => {
            if (err) {
                console.error('获取链接失败:', err);
                return res.status(500).json({ error: '获取链接失败，请稍后再试' });
            }
            res.json(links);
        });
});

// 添加导航链接 - 增强输入验证
app.post('/api/links', [
    authenticateToken,
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('名称长度必须在1-100个字符之间')
        .escape(),
    body('url')
        .trim()
        .isLength({ min: 1, max: 2000 }).withMessage('URL长度必须在1-2000个字符之间')
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('请输入有效的URL地址(必须包含http://或https://)')
], (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, url } = req.body;

    db.run('INSERT INTO links (user_id, name, url) VALUES (?, ?, ?)',
        [req.user.id, name, url],
        function(err) {
            if (err) {
                console.error('添加链接失败:', err);
                return res.status(500).json({ error: '添加链接失败，请稍后再试' });
            }
            res.json({
                id: this.lastID,
                name,
                url
            });
        });
});

// 删除导航链接 - 增强输入验证和安全性
app.delete('/api/links/:id', [
    authenticateToken,
    param('id').isInt().withMessage('无效的链接ID')
], (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    db.run('DELETE FROM links WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                console.error('删除链接失败:', err);
                return res.status(500).json({ error: '删除链接失败，请稍后再试' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '链接不存在或无权限删除' });
            }
            res.json({ message: '删除成功' });
        });
});

// 获取主机名，默认为环境变量中的值
const hostname = process.env.HOST || '0.0.0.0';

// 启动服务器
const server = app.listen(port, hostname, () => {
    const serverUrl = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`;
    console.log(`服务器运行在 ${serverUrl}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`); 
});

// 优雅关闭服务器
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        db.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        db.close();
        process.exit(0);
    });
});