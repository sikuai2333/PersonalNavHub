# 个人导航页面项目搭建指南

## 项目概述

这是一个简单的个人导航页面项目，允许用户注册、登录，并管理自己的网站导航链接。项目包含前端页面和后端服务器，使用了现代Web开发技术。

## 功能特点

- 用户注册和登录系统
- 个性化导航链接管理（添加、删除）
- 响应式设计，适配各种设备
- 简洁美观的用户界面

## 技术栈

- 前端：HTML, CSS, JavaScript (原生)
- 后端：Node.js, Express.js
- 数据库：SQLite
- 认证：JWT (JSON Web Token)

## 环境准备

### 必要软件

1. **Node.js** (v14.0.0 或更高版本)
   - 下载地址：[https://nodejs.org/](https://nodejs.org/)
   - 安装后，打开命令行工具验证安装：
     ```
     node -v
     npm -v
     ```

2. **文本编辑器**
   - 推荐使用 Visual Studio Code
   - 下载地址：[https://code.visualstudio.com/](https://code.visualstudio.com/)

## 项目结构

```
导航页面/
├── css/                # 样式文件
│   ├── style.css       # 主样式
│   └── auth.css        # 认证相关样式
├── js/                 # JavaScript文件
│   ├── main.js         # 主要功能逻辑
│   └── auth.js         # 认证相关逻辑
├── server/             # 后端服务器
│   ├── server.js       # 服务器入口文件
│   ├── package.json    # 项目依赖配置
│   └── navigation.db   # SQLite数据库文件(运行后自动生成)
└── index.html          # 主页面HTML
```

## 安装步骤

### 1. 下载项目

将项目文件下载到本地计算机上的一个文件夹中。

### 2. 安装后端依赖

1. 打开命令行工具（如Windows的命令提示符或PowerShell）
2. 导航到项目的server目录：
   ```
   cd 路径/到/导航页面/server
   ```
3. 安装依赖：
   ```
   npm install
   ```
   这将安装package.json中列出的所有依赖项。

### 3. 启动后端服务器

在server目录中，运行：
```
node server.js
```

如果一切正常，你应该看到以下消息：
```
服务器运行在 http://localhost:3000
数据库连接成功
```

## 使用指南

### 访问应用

1. 使用浏览器访问 http://localhost:3000
2. 如果你使用的是本地文件系统打开index.html，请确保后端服务器正在运行

### 用户注册和登录

1. 首次访问时，系统会自动显示登录/注册界面
2. 如果没有账号，点击"立即注册"链接
3. 填写用户名和密码，点击"注册"按钮
4. 注册成功后，使用新账号登录系统

### 管理导航链接

1. 登录后，可以看到导航页面
2. 点击右下角的"设置"按钮打开管理界面
3. 在管理界面中，可以：
   - 添加新链接：输入网站名称和URL，点击"添加链接