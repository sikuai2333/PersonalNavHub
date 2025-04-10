/**
 * 系统配置文件
 * 部署到服务器时，只需修改此文件中的配置项
 */

const config = {
    // API服务器地址，部署时修改为实际服务器地址
    // 例如: "https://your-server.com"
    apiBaseUrl: "http://localhost:5500"
    // 注意：敏感配置如JWT密钥已移至服务器端的.env文件中
    // 这样可以提高系统安全性，防止密钥泄露
};

// 在浏览器环境中导出
if (typeof window !== 'undefined') {
    window.appConfig = config;
}

// 在Node.js环境中导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}