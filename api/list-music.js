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
    // 修复：优先使用环境变量，但允许通过查询参数覆盖
    const {
      repo = process.env.GITHUB_REPO || '',
      path = process.env.MUSIC_PATH || '',
      branch = process.env.BRANCH || 'main',
      token = process.env.GITHUB_TOKEN || ''
    } = req.query;

    // 修复：同时支持两种参数命名方式
    const GITHUB_REPO = repo || req.query.GITHUB_REPO || process.env.GITHUB_REPO || '';
    const MUSIC_PATH = path || req.query.MUSIC_PATH || process.env.MUSIC_PATH || '';
    const BRANCH = branch || req.query.BRANCH || process.env.BRANCH || 'main';
    const GITHUB_TOKEN = token || req.query.GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';

    if (!GITHUB_REPO) {
      return res.status(400).json({ 
        success: false,
        error: '缺少 GitHub 仓库参数',
        message: '请提供 GITHUB_REPO 参数或设置环境变量'
      });
    }

    console.log('处理音乐列表请求:', { GITHUB_REPO, MUSIC_PATH, BRANCH });

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Vercel-Music-Player-API'
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    // 获取仓库内容
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${MUSIC_PATH}?ref=${BRANCH}`;
    console.log('GitHub API URL:', apiUrl);
    
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      console.error('GitHub API 错误:', response.status, response.statusText);
      return res.status(response.status).json({
        success: false,
        error: `GitHub API 错误: ${response.status} ${response.statusText}`,
        message: '请检查仓库地址、路径和访问权限'
      });
    }

    const contents = await response.json();

    // 如果是文件数组
    if (!Array.isArray(contents)) {
      return res.status(200).json({
        success: true,
        albums: [],
        totalSongs: 0,
        totalAlbums: 0,
        lastUpdated: new Date().toISOString(),
        repo: GITHUB_REPO,
        path: MUSIC_PATH || '根目录',
        branch: BRANCH,
        message: '指定路径不是文件夹或为空'
      });
    }

    // 分离文件夹和文件
    const folders = contents.filter(item => item.type === 'dir');
    const files = contents.filter(item => item.type === 'file');

    console.log(`找到 ${folders.length} 个文件夹，${files.length} 个文件`);

    // 处理根目录下的音乐文件
    const pathModule = require('path');
    const musicExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const rootMusicFiles = files.filter(file => {
      const ext = pathModule.extname(file.name).toLowerCase();
      return musicExtensions.includes(ext);
    });

    const albums = [];

    // 添加根目录专辑
    if (rootMusicFiles.length > 0) {
      const rootAlbum = {
        name: '根目录',
        path: MUSIC_PATH || '',
        cover: null,
        tracks: rootMusicFiles.map(file => {
          const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${MUSIC_PATH ? MUSIC_PATH + '/' : ''}${encodeURIComponent(file.name)}`;
          const fileNameWithoutExt = pathModule.basename(file.name, pathModule.extname(file.name));
          
          return {
            name: file.name,
            url: rawUrl,
            lrcUrl: rawUrl.replace(pathModule.extname(file.name), '.lrc'),
            size: file.size,
            type: getContentType(pathModule.extname(file.name)),
            displayName: fileNameWithoutExt.replace(/_/g, ' '),
            fileName: fileNameWithoutExt,
            id: Math.random().toString(36).substr(2, 9)
          };
        })
      };
      albums.push(rootAlbum);
      console.log(`根目录专辑: ${rootMusicFiles.length} 首歌曲`);
    }

    // 处理子文件夹（专辑）
    for (const folder of folders) {
      try {
        const folderApiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${folder.path}?ref=${BRANCH}`;
        const folderResponse = await fetch(folderApiUrl, { headers });
        
        if (folderResponse.ok) {
          const folderContents = await folderResponse.json();
          
          if (!Array.isArray(folderContents)) continue;
          
          const folderFiles = folderContents.filter(item => item.type === 'file');
          
          // 查找专辑封面
          const coverFile = folderFiles.find(file => 
            imageExtensions.includes(pathModule.extname(file.name).toLowerCase())
          );
          
          // 查找音乐文件
          const musicFiles = folderFiles.filter(file => 
            musicExtensions.includes(pathModule.extname(file.name).toLowerCase())
          );
          
          if (musicFiles.length > 0) {
            const album = {
              name: folder.name,
              path: folder.path,
              cover: coverFile ? `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${folder.path}/${encodeURIComponent(coverFile.name)}` : null,
              tracks: musicFiles.map(file => {
                const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${folder.path}/${encodeURIComponent(file.name)}`;
                const fileNameWithoutExt = pathModule.basename(file.name, pathModule.extname(file.name));
                
                return {
                  name: file.name,
                  url: rawUrl,
                  lrcUrl: rawUrl.replace(pathModule.extname(file.name), '.lrc'),
                  size: file.size,
                  type: getContentType(pathModule.extname(file.name)),
                  displayName: fileNameWithoutExt.replace(/_/g, ' '),
                  fileName: fileNameWithoutExt,
                  id: Math.random().toString(36).substr(2, 9)
                };
              })
            };
            albums.push(album);
            console.log(`专辑 "${folder.name}": ${musicFiles.length} 首歌曲`);
          }
        }
      } catch (folderError) {
        console.error(`处理文件夹 ${folder.name} 时出错:`, folderError);
      }
    }

    const totalSongs = albums.reduce((sum, album) => sum + album.tracks.length, 0);
    
    console.log(`总共 ${albums.length} 个专辑，${totalSongs} 首歌曲`);

    res.status(200).json({
      success: true,
      albums: albums,
      totalSongs: totalSongs,
      totalAlbums: albums.length,
      lastUpdated: new Date().toISOString(),
      repo: GITHUB_REPO,
      path: MUSIC_PATH || '根目录',
      branch: BRANCH
    });

  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({
      success: false,
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
