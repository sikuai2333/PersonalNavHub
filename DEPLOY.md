# 导航页面部署指南

本文档将指导您如何将导航页面系统部署到服务器上。

## 配置说明

系统使用了配置文件来管理服务器地址和JWT密钥，您只需修改配置文件即可完成部署配置。

### 1. 修改配置文件

打开 `js/config.js` 文件，修改以下配置项：

```javascript
const config = {
    // 修改为您的实际服务器地址
    // 例如: "https://your-domain.com" 或 "http://your-server-ip:3000"
    apiBaseUrl: "http://localhost:3000",
    
    // 修改为您的JWT密钥（建议使用强随机字符串）
    jwtSecret: "your-secret-key"
};
```

### 2. 前端部署

前端是纯静态文件，您可以将整个项目目录（除了server文件夹）部署到任何Web服务器上：

- Nginx
- Apache
- 或任何静态文件托管服务

### 3. 后端部署

后端需要Node.js环境，按照以下步骤部署：

1. 将整个项目复制到服务器
2. 进入server目录
3. 安装依赖：
   ```
   npm install
   ```
4. 启动服务器：
   ```
   node server.js
   ```

对于生产环境，建议使用进程管理工具如PM2：
```
npm install -g pm2
pm2 start server.js
```

### 4. 环境变量（可选）

您也可以通过环境变量覆盖配置：

- `PORT`: 服务器端口
- `HOST`: 服务器主机名
- `JWT_SECRET`: JWT密钥

例如：
```
PORT=8080 JWT_SECRET=my-secure-key node server.js
```

## 注意事项

1. 确保修改默认的JWT密钥，使用强随机字符串以提高安全性
2. 如果您的服务器使用HTTPS，请确保apiBaseUrl使用https协议
3. 确保服务器防火墙允许您配置的端口访问

## 故障排除

- 如果前端无法连接到后端，请检查apiBaseUrl配置是否正确
- 如果遇到CORS错误，请确保后端服务器允许前端域名的跨域请求
- 如果JWT验证失败，请确保前后端使用相同的JWT密钥