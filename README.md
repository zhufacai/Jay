# GitHub 音乐播放器
这是一个部署在 Vercel 上的静态音乐播放器网站，可以直接播放 GitHub 仓库中的音乐文件。


## 功能特性

- 🎵 播放 GitHub 仓库中的音乐文件
- 🎨 现代化 UI 设计，响应式布局
- ⏯️ 播放/暂停、上一首/下一首控制
- 📊 进度条和音量控制
- 📋 播放列表显示
- ⌨️ 键盘快捷键支持
- 🔄 自动播放下一首
-  🎫 歌词显示
- ⚡ Vercel 边缘网络加速

## 部署步骤

### 方法一：一键部署到 Vercel

[![部署到 Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/vercel-music-player&env=GITHUB_REPO,MUSIC_PATH,GITHUB_TOKEN&envDescription=GitHub%20配置信息)

### 方法二：手动部署

**克隆仓库**

```bash
git clone https://github.com/zhufacai/Jay.git
cd Jay
```

## 环境变量说明

| 变量名         | 必填 | 默认值  | 说明                                 |
| :------------- | :--- | :------ | :----------------------------------- |
| `GITHUB_REPO`  | 是   | 无      | GitHub 仓库地址，格式：`owner/repo`  |
| `MUSIC_PATH`   | 否   | `music` | 仓库中的音乐文件夹路径               |
| `GITHUB_TOKEN` | 否   | 空      | GitHub 个人访问令牌（提高 API 限制） |
| `BRANCH`       | 否   | `main`  | 仓库分支名称                         |

## 使用说明

### 1. **环境变量配置**

在Vercel项目中设置以下环境变量：

- `GITHUB_REPO`: GitHub仓库地址，格式：`username/repo`
- `MUSIC_PATH`: 音乐文件夹路径，留空表示根目录，或指定文件夹路径如`music`
- `GITHUB_TOKEN`（可选）: GitHub个人访问令牌，用于提高API限制
- `BRANCH`（可选）: 仓库分支，默认为`main`

### 2. **仓库结构要求**

GitHub仓库可以有以下结构：

- 根目录下有多个文件夹，每个文件夹代表一个专辑
- 每个专辑文件夹中可以包含：
  - 音乐文件（.mp3, .wav, .ogg, .m4a, .flac, .aac）
  - 封面图片（.jpg, .jpeg, .png, .gif，会自动识别为专辑封面）
  - 歌词文件（与音乐文件同名的.lrc文件）

### 3. **歌词文件格式**

歌词文件应为标准的LRC格式，例如：

text

```
[00:00.00] 歌曲名 - 歌手
[00:12.34] 第一句歌词
[00:23.45] 第二句歌词
```



### 4. **部署步骤**

1. 将代码部署到Vercel
2. 设置环境变量
3. Vercel会自动构建并生成音乐播放器网站
4. 访问网站即可使用所有功能

