/**
 * 系统配置文件
 * 部署到服务器时，只需修改此文件中的配置项
 */

const config = {
    // API服务器地址，部署时修改为实际服务器地址
    // 例如: "https://your-server.com"
    apiBaseUrl: "http://localhost:3000",
    
    // JWT密钥（仅后端使用）
    // 部署时应修改为强密钥
    jwtSecret: "your-secret-key"
};

// 在浏览器环境中导出
if (typeof window !== 'undefined') {
    window.appConfig = config;
}

// 在Node.js环境中导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}