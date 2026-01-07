const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // 允许CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const {
      GITHUB_REPO = process.env.GITHUB_REPO || '',
      MUSIC_PATH = process.env.MUSIC_PATH || 'music',
      BRANCH = process.env.BRANCH || 'main',
      GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
    } = req.query;

    if (!GITHUB_REPO) {
      return res.status(400).json({ error: '缺少 GitHub 仓库参数' });
    }

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Vercel-Music-Player-API'
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    // 获取仓库内容
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${MUSIC_PATH}?ref=${BRANCH}`;
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `GitHub API 错误: ${response.status} ${response.statusText}`
      });
    }

    const files = await response.json();

    // 过滤音乐文件
    const path = require('path');
    const musicExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    const musicFiles = files.filter(file => {
      if (file.type !== 'file') return false;
      const ext = path.extname(file.name).toLowerCase();
      return musicExtensions.includes(ext);
    });

    // 生成音乐列表
    const musicList = musicFiles.map(file => {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${MUSIC_PATH}/${encodeURIComponent(file.name)}`;
      
      return {
        name: file.name,
        url: rawUrl,
        size: file.size,
        type: getContentType(path.extname(file.name)),
        displayName: path.basename(file.name, path.extname(file.name)).replace(/_/g, ' '),
        sha: file.sha
      };
    });

    // 按文件名排序
    musicList.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      count: musicList.length,
      repo: GITHUB_REPO,
      path: MUSIC_PATH,
      branch: BRANCH,
      lastUpdated: new Date().toISOString(),
      tracks: musicList
    });

  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
};

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
