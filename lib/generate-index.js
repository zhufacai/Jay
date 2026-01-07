const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 配置参数 - 通过环境变量设置
const GITHUB_REPO = process.env.GITHUB_REPO || 'username/repo'; // 格式: owner/repo
const MUSIC_PATH = process.env.MUSIC_PATH || 'music'; // 仓库中的音乐文件夹路径
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // GitHub token (可选，用于提高API限制)
const BRANCH = process.env.BRANCH || 'main';

async function fetchMusicFiles() {
  try {
    console.log('正在获取音乐文件列表...');
    console.log(`仓库: ${GITHUB_REPO}`);
    console.log(`路径: ${MUSIC_PATH}`);
    console.log(`分支: ${BRANCH}`);
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Vercel-Music-Player'
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    
    // 获取仓库内容
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${MUSIC_PATH}?ref=${BRANCH}`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status} ${response.statusText}`);
    }
    
    const files = await response.json();
    
    // 过滤音乐文件
    const musicExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    const musicFiles = files.filter(file => {
      if (file.type !== 'file') return false;
      const ext = path.extname(file.name).toLowerCase();
      return musicExtensions.includes(ext);
    });
    
    console.log(`找到 ${musicFiles.length} 个音乐文件`);
    
    // 生成音乐列表数据
    const musicList = musicFiles.map(file => {
      // 使用GitHub的raw内容URL
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${MUSIC_PATH}/${encodeURIComponent(file.name)}`;
      
      return {
        name: file.name,
        url: rawUrl,
        size: file.size,
        type: getContentType(path.extname(file.name)),
        displayName: path.basename(file.name, path.extname(file.name)).replace(/_/g, ' '),
        id: Math.random().toString(36).substr(2, 9) // 为每首歌生成唯一ID
      };
    });
    
    // 排序：按文件名排序
    musicList.sort((a, b) => a.name.localeCompare(b.name));
    
    // 将音乐列表写入public目录
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // 生成音乐列表JSON文件
    fs.writeFileSync(
      path.join(publicDir, 'music-list.json'),
      JSON.stringify(musicList, null, 2)
    );
    
    console.log('音乐列表已生成:', musicList.length, '首歌曲');
    
    // 如果index.html不存在，创建默认的
    const indexPath = path.join(publicDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      createModernIndexHtml(indexPath, musicList);
      console.log('已创建现代风格的 index.html');
    }
    
  } catch (error) {
    console.error('获取音乐文件时出错:', error);
    // 创建空列表作为后备
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(publicDir, 'music-list.json'),
      JSON.stringify([], null, 2)
    );
    
    const indexPath = path.join(publicDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      createModernIndexHtml(indexPath, []);
      console.log('已创建默认 index.html（无音乐文件）');
    }
  }
}

function getContentType(ext) {
  const types = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac'
  };
  
  return types[ext.toLowerCase()] || 'audio/mpeg';
}

function createModernIndexHtml(filePath, musicList) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub 音乐播放器 | 现代音乐体验</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1DB954;
            --primary-dark: #1AA34A;
            --secondary: #535353;
            --bg-primary: #121212;
            --bg-secondary: #181818;
            --bg-tertiary: #282828;
            --text-primary: #FFFFFF;
            --text-secondary: #B3B3B3;
            --text-tertiary: #7A7A7A;
            --card-bg: #1E1E1E;
            --shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            --border-radius: 12px;
            --border-radius-sm: 8px;
            --border-radius-lg: 16px;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        /* 加载动画 */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-primary);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            transition: opacity 0.5s ease;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid var(--secondary);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        .loading-text {
            font-size: 16px;
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* 主容器 */
        .app-container {
            display: flex;
            min-height: 100vh;
            background: linear-gradient(180deg, var(--bg-primary) 0%, #000000 100%);
        }
        
        /* 侧边栏 */
        .sidebar {
            width: 280px;
            background: rgba(0, 0, 0, 0.5);
            padding: 24px;
            display: flex;
            flex-direction: column;
            border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 32px;
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .logo-icon {
            background: var(--primary);
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .nav-section {
            margin-bottom: 32px;
        }
        
        .nav-title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-tertiary);
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 16px;
            border-radius: var(--border-radius-sm);
            color: var(--text-secondary);
            text-decoration: none;
            transition: var(--transition);
            margin-bottom: 4px;
            cursor: pointer;
        }
        
        .nav-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
        }
        
        .nav-item.active {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
        }
        
        .nav-item i {
            font-size: 20px;
            width: 24px;
        }
        
        .playlist-section {
            flex-grow: 1;
            overflow-y: auto;
        }
        
        .playlist-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            border-radius: var(--border-radius-sm);
            color: var(--text-secondary);
            transition: var(--transition);
            cursor: pointer;
            margin-bottom: 4px;
        }
        
        .playlist-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
        }
        
        .playlist-item.active {
            background: rgba(29, 185, 84, 0.1);
            color: var(--primary);
        }
        
        .playlist-cover {
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .playlist-info {
            flex-grow: 1;
            overflow: hidden;
        }
        
        .playlist-name {
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .playlist-count {
            font-size: 12px;
            color: var(--text-tertiary);
        }
        
        /* 主内容区 */
        .main-content {
            flex-grow: 1;
            padding: 24px;
            overflow-y: auto;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
        }
        
        .page-title {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(45deg, var(--primary), #1ED760);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .repo-info {
            background: var(--card-bg);
            padding: 12px 20px;
            border-radius: var(--border-radius);
            font-size: 14px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .repo-info i {
            color: var(--primary);
        }
        
        /* 欢迎卡片 */
        .welcome-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: var(--border-radius-lg);
            padding: 40px;
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            transform: translate(30%, -30%);
        }
        
        .welcome-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        
        .welcome-subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 24px;
            max-width: 500px;
        }
        
        .stats {
            display: flex;
            gap: 24px;
            margin-top: 24px;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .stat-icon {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
        }
        
        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }
        
        /* 音乐网格 */
        .music-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .music-card {
            background: var(--card-bg);
            border-radius: var(--border-radius);
            padding: 20px;
            transition: var(--transition);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        
        .music-card:hover {
            background: var(--bg-tertiary);
            transform: translateY(-4px);
            box-shadow: var(--shadow);
        }
        
        .music-card.playing {
            background: rgba(29, 185, 84, 0.1);
            border: 1px solid rgba(29, 185, 84, 0.3);
        }
        
        .music-card-cover {
            width: 100%;
            aspect-ratio: 1;
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .music-card-cover img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .play-overlay {
            position: absolute;
            bottom: 8px;
            right: 8px;
            width: 40px;
            height: 40px;
            background: var(--primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: translateY(10px);
            transition: var(--transition);
        }
        
        .music-card:hover .play-overlay {
            opacity: 1;
            transform: translateY(0);
        }
        
        .music-card-info {
            flex-grow: 1;
        }
        
        .music-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .music-artist {
            font-size: 14px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .music-duration {
            font-size: 12px;
            color: var(--text-tertiary);
            margin-top: 8px;
        }
        
        /* 播放器 */
        .player-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding: 16px 24px;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 24px;
        }
        
        .player-now-playing {
            display: flex;
            align-items: center;
            gap: 16px;
            min-width: 300px;
        }
        
        .player-cover {
            width: 56px;
            height: 56px;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        
        .player-track-info {
            flex-grow: 1;
            overflow: hidden;
        }
        
        .player-track-title {
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .player-track-artist {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .player-controls {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 600px;
        }
        
        .control-buttons {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 12px;
        }
        
        .control-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 20px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
        }
        
        .control-btn:hover {
            color: var(--text-primary);
            transform: scale(1.1);
        }
        
        .control-btn.play-pause {
            width: 40px;
            height: 40px;
            background: var(--text-primary);
            color: #000;
            border-radius: 50%;
        }
        
        .control-btn.play-pause:hover {
            transform: scale(1.05);
        }
        
        .player-progress {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .progress-time {
            font-size: 12px;
            color: var(--text-secondary);
            min-width: 40px;
        }
        
        .progress-bar {
            flex-grow: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            cursor: pointer;
            position: relative;
        }
        
        .progress-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: var(--primary);
            width: 0%;
            transition: width 0.1s linear;
        }
        
        .progress-handle {
            position: absolute;
            top: 50%;
            width: 12px;
            height: 12px;
            background: var(--text-primary);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .progress-bar:hover .progress-handle {
            opacity: 1;
        }
        
        .player-extra {
            display: flex;
            align-items: center;
            gap: 16px;
            min-width: 200px;
            justify-content: flex-end;
        }
        
        .volume-control {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .volume-slider {
            width: 80px;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
            cursor: pointer;
        }
        
        .volume-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: var(--text-secondary);
            width: 70%;
        }
        
        /* 响应式设计 */
        @media (max-width: 1024px) {
            .sidebar {
                width: 240px;
            }
            
            .music-grid {
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            }
        }
        
        @media (max-width: 768px) {
            .app-container {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                padding: 16px;
                border-right: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .main-content {
                padding: 16px;
            }
            
            .player-container {
                padding: 12px 16px;
                flex-wrap: wrap;
            }
            
            .player-now-playing {
                min-width: auto;
                flex-grow: 1;
            }
            
            .player-controls {
                order: 3;
                width: 100%;
                margin-top: 12px;
            }
            
            .player-extra {
                min-width: auto;
            }
            
            .welcome-card {
                padding: 24px;
            }
            
            .stats {
                flex-direction: column;
                gap: 16px;
            }
        }
        
        @media (max-width: 480px) {
            .music-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 12px;
            }
            
            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
            }
            
            .page-title {
                font-size: 24px;
            }
        }
        
        /* 空状态 */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;
        }
        
        .empty-state-icon {
            font-size: 64px;
            color: var(--text-tertiary);
            margin-bottom: 24px;
        }
        
        .empty-state-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--text-primary);
        }
        
        .empty-state-description {
            font-size: 14px;
            color: var(--text-secondary);
            max-width: 400px;
            margin-bottom: 24px;
        }
        
        /* 动画 */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease forwards;
        }
        
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <!-- 加载动画 -->
    <div class="loading-overlay" id="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载音乐库...</div>
    </div>
    
    <!-- 主应用容器 -->
    <div class="app-container hidden" id="app-container">
        <!-- 侧边栏 -->
        <div class="sidebar">
            <div class="logo">
                <div class="logo-icon">
                    <i class="fas fa-music"></i>
                </div>
                <span>GitHub Music</span>
            </div>
            
            <div class="nav-section">
                <div class="nav-title">导航</div>
                <div class="nav-item active" data-page="home">
                    <i class="fas fa-home"></i>
                    <span>主页</span>
                </div>
                <div class="nav-item" data-page="library">
                    <i class="fas fa-compact-disc"></i>
                    <span>音乐库</span>
                </div>
                <div class="nav-item" data-page="playlists">
                    <i class="fas fa-list"></i>
                    <span>播放列表</span>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-title">发现</div>
                <div class="nav-item">
                    <i class="fas fa-fire"></i>
                    <span>热门歌曲</span>
                </div>
                <div class="nav-item">
                    <i class="fas fa-random"></i>
                    <span>随机播放</span>
                </div>
            </div>
            
            <div class="playlist-section">
                <div class="nav-title">你的歌单</div>
                <div id="playlist-container">
                    <!-- 动态生成播放列表 -->
                </div>
            </div>
            
            <div class="repo-info">
                <i class="fab fa-github"></i>
                <span id="repo-display">${GITHUB_REPO || '未配置仓库'}</span>
            </div>
        </div>
        
        <!-- 主内容区 -->
        <div class="main-content">
            <!-- 头部 -->
            <div class="header">
                <h1 class="page-title">音乐库</h1>
                <div class="repo-info">
                    <i class="fas fa-folder"></i>
                    <span id="music-path">${MUSIC_PATH || 'music'}</span>
                </div>
            </div>
            
            <!-- 欢迎卡片 -->
            <div class="welcome-card fade-in" id="welcome-card">
                <h2 class="welcome-title">欢迎来到 GitHub 音乐播放器</h2>
                <p class="welcome-subtitle">直接从您的 GitHub 仓库播放音乐文件。支持 MP3, WAV, OGG, FLAC, AAC 等多种格式。</p>
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-music"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="total-songs">0</div>
                            <div class="stat-label">首歌曲</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-database"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="total-size">0 MB</div>
                            <div class="stat-label">总大小</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="last-updated">刚刚</div>
                            <div class="stat-label">最近更新</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 音乐网格 -->
            <div id="music-grid-container">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <h3 class="empty-state-title">正在加载音乐...</h3>
                    <p class="empty-state-description">请稍候，我们正在从 GitHub 仓库获取您的音乐文件。</p>
                </div>
            </div>
        </div>
        
        <!-- 播放器控件 -->
        <div class="player-container hidden" id="player-container">
            <div class="player-now-playing">
                <div class="player-cover" id="player-cover">
                    <i class="fas fa-music"></i>
                </div>
                <div class="player-track-info">
                    <div class="player-track-title" id="player-track-title">选择一首歌曲开始播放</div>
                    <div class="player-track-artist" id="player-track-artist">GitHub Music</div>
                </div>
            </div>
            
            <div class="player-controls">
                <div class="control-buttons">
                    <button class="control-btn" id="shuffle-btn" title="随机播放">
                        <i class="fas fa-random"></i>
                    </button>
                    <button class="control-btn" id="prev-btn" title="上一首">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button class="control-btn play-pause" id="play-btn" title="播放">
                        <i class="fas fa-play" id="play-icon"></i>
                    </button>
                    <button class="control-btn" id="next-btn" title="下一首">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button class="control-btn" id="repeat-btn" title="重复播放">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
                
                <div class="player-progress">
                    <span class="progress-time" id="current-time">0:00</span>
                    <div class="progress-bar" id="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                        <div class="progress-handle" id="progress-handle"></div>
                    </div>
                    <span class="progress-time" id="duration">0:00</span>
                </div>
            </div>
            
            <div class="player-extra">
                <div class="volume-control">
                    <button class="control-btn" id="volume-btn" title="静音">
                        <i class="fas fa-volume-up" id="volume-icon"></i>
                    </button>
                    <div class="volume-slider" id="volume-slider">
                        <div class="volume-fill" id="volume-fill"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 音频元素 -->
    <audio id="audio-player" preload="metadata"></audio>
    
    <script>
        // 全局变量
        let musicList = [];
        let currentTrackIndex = -1;
        let isPlaying = false;
        let isShuffle = false;
        let isRepeat = false;
        let volume = 0.7;
        let audio = document.getElementById('audio-player');
        
        // DOM 元素
        const loadingOverlay = document.getElementById('loading-overlay');
        const appContainer = document.getElementById('app-container');
        const playerContainer = document.getElementById('player-container');
        const musicGridContainer = document.getElementById('music-grid-container');
        const playlistContainer = document.getElementById('playlist-container');
        
        // 播放器元素
        const playBtn = document.getElementById('play-btn');
        const playIcon = document.getElementById('play-icon');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const shuffleBtn = document.getElementById('shuffle-btn');
        const repeatBtn = document.getElementById('repeat-btn');
        const volumeBtn = document.getElementById('volume-btn');
        const volumeIcon = document.getElementById('volume-icon');
        const progressBar = document.getElementById('progress-bar');
        const progressFill = document.getElementById('progress-fill');
        const progressHandle = document.getElementById('progress-handle');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeFill = document.getElementById('volume-fill');
        
        // 信息元素
        const playerTrackTitle = document.getElementById('player-track-title');
        const playerTrackArtist = document.getElementById('player-track-artist');
        const playerCover = document.getElementById('player-cover');
        const totalSongsEl = document.getElementById('total-songs');
        const totalSizeEl = document.getElementById('total-size');
        const lastUpdatedEl = document.getElementById('last-updated');
        const repoDisplayEl = document.getElementById('repo-display');
        const musicPathEl = document.getElementById('music-path');
        
        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', async () => {
            // 设置仓库信息
            repoDisplayEl.textContent = '${GITHUB_REPO || '未配置仓库'}';
            musicPathEl.textContent = '${MUSIC_PATH || 'music'}';
            
            // 加载音乐列表
            await loadMusicList();
            
            // 隐藏加载界面，显示主界面
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                    appContainer.classList.remove('hidden');
                    if (musicList.length > 0) {
                        playerContainer.classList.remove('hidden');
                    }
                }, 500);
            }, 1000);
        });
        
        // 加载音乐列表
        async function loadMusicList() {
            try {
                const response = await fetch('/music-list.json');
                if (!response.ok) throw new Error('无法加载音乐列表');
                
                musicList = await response.json();
                
                // 更新统计信息
                updateStats();
                
                // 渲染音乐网格
                renderMusicGrid();
                
                // 渲染播放列表
                renderPlaylist();
                
                // 如果有音乐文件，初始化播放器
                if (musicList.length > 0) {
                    // 设置默认音量
                    audio.volume = volume;
                    updateVolumeUI();
                    
                    // 如果有上次播放的记录，恢复播放位置
                    const lastPlayedIndex = localStorage.getItem('lastPlayedIndex');
                    if (lastPlayedIndex !== null && lastPlayedIndex < musicList.length) {
                        loadTrack(parseInt(lastPlayedIndex), false);
                    }
                }
                
            } catch (error) {
                console.error('加载音乐列表失败:', error);
                showEmptyState('无法加载音乐列表', '请检查 GitHub 仓库配置或网络连接。');
            }
        }
        
        // 更新统计信息
        function updateStats() {
            totalSongsEl.textContent = musicList.length;
            
            // 计算总大小
            const totalSize = musicList.reduce((sum, track) => sum + (track.size || 0), 0);
            const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
            totalSizeEl.textContent = \`\${totalSizeMB} MB\`;
            
            // 设置最后更新时间
            lastUpdatedEl.textContent = '刚刚';
        }
        
        // 渲染音乐网格
        function renderMusicGrid() {
            if (musicList.length === 0) {
                showEmptyState('没有找到音乐文件', '请在 GitHub 仓库的指定路径下添加音乐文件。');
                return;
            }
            
            musicGridContainer.innerHTML = '';
            
            musicList.forEach((track, index) => {
                const card = document.createElement('div');
                card.className = 'music-card fade-in';
                card.style.animationDelay = \`\${index * 0.05}s\`;
                
                if (index === currentTrackIndex) {
                    card.classList.add('playing');
                }
                
                // 生成随机渐变背景
                const gradients = [
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
                ];
                
                const gradient = gradients[index % gradients.length];
                
                card.innerHTML = \`
                    <div class="music-card-cover" style="background: \${gradient};">
                        <div class="play-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="music-card-info">
                        <div class="music-title">\${track.displayName}</div>
                        <div class="music-artist">GitHub Music</div>
                        <div class="music-duration">\${formatFileSize(track.size)}</div>
                    </div>
                \`;
                
                card.addEventListener('click', () => {
                    loadTrack(index);
                    playTrack();
                    
                    // 滚动到播放器
                    playerContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
                
                musicGridContainer.appendChild(card);
            });
        }
        
        // 渲染播放列表
        function renderPlaylist() {
            if (musicList.length === 0) return;
            
            playlistContainer.innerHTML = '';
            
            // 创建默认播放列表
            const defaultPlaylist = document.createElement('div');
            defaultPlaylist.className = 'playlist-item active';
            defaultPlaylist.innerHTML = \`
                <div class="playlist-cover">
                    <i class="fas fa-music"></i>
                </div>
                <div class="playlist-info">
                    <div class="playlist-name">所有歌曲</div>
                    <div class="playlist-count">\${musicList.length} 首歌曲</div>
                </div>
            \`;
            
            defaultPlaylist.addEventListener('click', () => {
                document.querySelectorAll('.playlist-item').forEach(item => {
                    item.classList.remove('active');
                });
                defaultPlaylist.classList.add('active');
            });
            
            playlistContainer.appendChild(defaultPlaylist);
        }
        
        // 显示空状态
        function showEmptyState(title, description) {
            musicGridContainer.innerHTML = \`
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <h3 class="empty-state-title">\${title}</h3>
                    <p class="empty-state-description">\${description}</p>
                </div>
            \`;
        }
        
        // 加载指定曲目
        function loadTrack(index, playImmediately = true) {
            if (index < 0 || index >= musicList.length) return;
            
            // 保存当前播放索引
            currentTrackIndex = index;
            localStorage.setItem('lastPlayedIndex', index);
            
            const track = musicList[index];
            
            // 设置音频源
            audio.src = track.url;
            audio.type = track.type || 'audio/mpeg';
            
            // 更新播放器界面
            playerTrackTitle.textContent = track.displayName;
            playerTrackArtist.textContent = 'GitHub Music';
            
            // 更新音乐卡片高亮
            updatePlayingCard();
            
            // 加载元数据
            audio.addEventListener('loadedmetadata', function() {
                durationEl.textContent = formatTime(audio.duration);
                
                // 如果设置了自动播放，则播放
                if (playImmediately) {
                    playTrack();
                }
            }, { once: true });
        }
        
        // 更新播放中的卡片高亮
        function updatePlayingCard() {
            document.querySelectorAll('.music-card').forEach((card, index) => {
                if (index === currentTrackIndex) {
                    card.classList.add('playing');
                } else {
                    card.classList.remove('playing');
                }
            });
        }
        
        // 播放/暂停
        function togglePlay() {
            if (musicList.length === 0 || currentTrackIndex === -1) return;
            
            if (isPlaying) {
                pauseTrack();
            } else {
                playTrack();
            }
        }
        
        // 播放
        function playTrack() {
            if (musicList.length === 0 || currentTrackIndex === -1) {
                // 如果没有正在播放的曲目，播放第一首
                loadTrack(0);
                return;
            }
            
            audio.play();
            isPlaying = true;
            playIcon.className = 'fas fa-pause';
            playBtn.title = '暂停';
        }
        
        // 暂停
        function pauseTrack() {
            audio.pause();
            isPlaying = false;
            playIcon.className = 'fas fa-play';
            playBtn.title = '播放';
        }
        
        // 下一首
        function nextTrack() {
            if (musicList.length === 0) return;
            
            let nextIndex;
            if (isShuffle) {
                // 随机播放
                nextIndex = Math.floor(Math.random() * musicList.length);
                while (nextIndex === currentTrackIndex && musicList.length > 1) {
                    nextIndex = Math.floor(Math.random() * musicList.length);
                }
            } else {
                // 顺序播放
                nextIndex = (currentTrackIndex + 1) % musicList.length;
            }
            
            loadTrack(nextIndex);
        }
        
        // 上一首
        function prevTrack() {
            if (musicList.length === 0) return;
            
            let prevIndex;
            if (isShuffle) {
                // 随机播放
                prevIndex = Math.floor(Math.random() * musicList.length);
                while (prevIndex === currentTrackIndex && musicList.length > 1) {
                    prevIndex = Math.floor(Math.random() * musicList.length);
                }
            } else {
                // 顺序播放
                prevIndex = (currentTrackIndex - 1 + musicList.length) % musicList.length;
            }
            
            loadTrack(prevIndex);
        }
        
        // 切换随机播放
        function toggleShuffle() {
            isShuffle = !isShuffle;
            shuffleBtn.style.color = isShuffle ? 'var(--primary)' : 'var(--text-secondary)';
            shuffleBtn.title = isShuffle ? '关闭随机播放' : '开启随机播放';
        }
        
        // 切换重复播放
        function toggleRepeat() {
            isRepeat = !isRepeat;
            repeatBtn.style.color = isRepeat ? 'var(--primary)' : 'var(--text-secondary)';
            repeatBtn.title = isRepeat ? '关闭重复播放' : '开启重复播放';
        }
        
        // 切换音量
        function toggleMute() {
            if (audio.volume > 0) {
                audio.volume = 0;
                volumeIcon.className = 'fas fa-volume-mute';
                volumeFill.style.width = '0%';
            } else {
                audio.volume = volume;
                updateVolumeUI();
            }
        }
        
        // 设置音量
        function setVolume(e) {
            const rect = volumeSlider.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            
            volume = Math.max(0, Math.min(1, clickX / width));
            audio.volume = volume;
            
            updateVolumeUI();
        }
        
        // 更新音量UI
        function updateVolumeUI() {
            volumeFill.style.width = \`\${volume * 100}%\`;
            
            if (volume === 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        }
        
        // 更新进度条
        function updateProgress() {
            const { currentTime, duration } = audio;
            const progressPercent = (currentTime / duration) * 100;
            
            progressFill.style.width = \`\${progressPercent}%\`;
            progressHandle.style.left = \`\${progressPercent}%\`;
            
            currentTimeEl.textContent = formatTime(currentTime);
            
            // 如果歌曲结束
            if (currentTime >= duration - 0.5) {
                if (isRepeat) {
                    // 重复播放当前歌曲
                    audio.currentTime = 0;
                    audio.play();
                } else {
                    // 播放下一首
                    nextTrack();
                }
            }
        }
        
        // 设置播放进度
        function setProgress(e) {
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            
            const percent = Math.max(0, Math.min(1, clickX / width));
            audio.currentTime = percent * audio.duration;
        }
        
        // 格式化时间 (秒 -> MM:SS)
        function formatTime(seconds) {
            if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
            
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
        }
        
        // 格式化文件大小
        function formatFileSize(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
        
        // 事件监听器
        playBtn.addEventListener('click', togglePlay);
        prevBtn.addEventListener('click', prevTrack);
        nextBtn.addEventListener('click', nextTrack);
        shuffleBtn.addEventListener('click', toggleShuffle);
        repeatBtn.addEventListener('click', toggleRepeat);
        volumeBtn.addEventListener('click', toggleMute);
        volumeSlider.addEventListener('click', setVolume);
        
        // 音频事件
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => {
            if (!isRepeat) {
                nextTrack();
            }
        });
        
        // 进度条事件
        progressBar.addEventListener('click', setProgress);
        
        // 导航点击事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                this.classList.add('active');
                
                // 这里可以添加页面切换逻辑
            });
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // 空格键: 播放/暂停
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                togglePlay();
            }
            
            // 右箭头: 快进10秒
            if (e.code === 'ArrowRight' && e.ctrlKey) {
                e.preventDefault();
                audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
            }
            
            // 左箭头: 快退10秒
            if (e.code === 'ArrowLeft' && e.ctrlKey) {
                e.preventDefault();
                audio.currentTime = Math.max(0, audio.currentTime - 10);
            }
            
            // N: 下一首
            if (e.code === 'KeyN' && e.ctrlKey) {
                e.preventDefault();
                nextTrack();
            }
            
            // P: 上一首
            if (e.code === 'KeyP' && e.ctrlKey) {
                e.preventDefault();
                prevTrack();
            }
            
            // M: 静音
            if (e.code === 'KeyM' && e.ctrlKey) {
                e.preventDefault();
                toggleMute();
            }
            
            // 上箭头: 增加音量
            if (e.code === 'ArrowUp' && e.ctrlKey) {
                e.preventDefault();
                volume = Math.min(1, volume + 0.1);
                audio.volume = volume;
                updateVolumeUI();
            }
            
            // 下箭头: 减少音量
            if (e.code === 'ArrowDown' && e.ctrlKey) {
                e.preventDefault();
                volume = Math.max(0, volume - 0.1);
                audio.volume = volume;
                updateVolumeUI();
            }
        });
    </script>
</body>
</html>`;
  
  fs.writeFileSync(filePath, html);
}

// 执行主函数
if (require.main === module) {
  fetchMusicFiles();
}

module.exports = fetchMusicFiles;
