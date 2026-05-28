# `localhost3000-static.html` 接入 `D:\AI工作台` 说明

## 目标

将当前静态复刻前端迁移到 `D:\AI工作台` 中使用。该前端只保留页面视觉和本地交互，不接入后台，不调用 LLM，不上传文件，不请求麦克风。

## 需要复制的文件

从当前目录：

```text
D:\ai工作台ui前端\AI工作台\zip
```

复制以下内容到：

```text
D:\AI工作台
```

建议目标结构保持为：

```text
D:\AI工作台
  localhost3000-static.html
  public\
    重构\
      index.html
      placeholder.svg
      icon.svg
      Home_Top.mp4
      fonts\
        ZonaPro-SemiBold.ttf
      arc-cards\
        01_图片生成.png
        02_视频生成.png
        ...
        17_视频配音.png
      案例\
        gallery-1.jpg
        gallery-2.jpg
        ...
        bg-ocean.mp4
        悬浮岛史诗.mp4
        星墨鲸鱼.webm
        水下柯基.webm
        hot-*.jpg
        thumb-*.jpg
```

最简单安全的复制方式是：

```text
复制 localhost3000-static.html
复制整个 public\重构 文件夹
```

## 不需要复制的内容

以下内容不是静态复刻前端运行所必需：

```text
node_modules
.next
app
components
hooks
lib
styles
package.json
pnpm-lock.yaml
tsconfig.json
next.config.mjs
tailwind.config.ts
```

## 路径依赖说明

`localhost3000-static.html` 依赖相对路径：

```html
public/重构/index.html?sidebar=open
```

因此 `public\重构\index.html` 必须和 `localhost3000-static.html` 保持如下相对位置：

```text
localhost3000-static.html
public\重构\index.html
```

`public\重构\index.html` 内部继续使用相对路径引用资源，例如：

```html
fonts/ZonaPro-SemiBold.ttf
Home_Top.mp4
arc-cards/01_图片生成.png
案例/gallery-1.jpg
placeholder.svg
```

所以不要只复制 `index.html`，必须保留 `public\重构` 内部目录结构。

## 运行方式

### 方式一：直接双击打开

双击：

```text
D:\AI工作台\localhost3000-static.html
```

页面会以 `file://` 方式运行。

### 方式二：放入现有前端静态目录

如果 `D:\AI工作台` 中已有前端服务，可以把：

```text
localhost3000-static.html
public\重构
```

放到该服务能访问的静态目录中，但必须保证浏览器能访问：

```text
/public/重构/index.html
/public/重构/Home_Top.mp4
/public/重构/arc-cards/...
/public/重构/案例/...
```

## 当前功能边界

当前静态前端包含：

- 首页复刻：左侧栏、顶部栏、首页 iframe、hero 视频、功能卡、案例墙。
- 大模型页面：按截图复刻 Composer 输入框、`Inspiration` 下拉、模型下拉、上传按钮、麦克风按钮、发送按钮。
- 其它模块：点击后只切换导航选中状态，内容区域为空白。

当前静态前端不会：

- 请求 `D:\AI工作台\backend`
- 请求 `/api/*`
- 请求 `localhost:3006`
- 调用 `fetch`
- 打开文件选择器
- 请求麦克风权限
- 接入真实 LLM

## 验证清单

迁移后检查：

1. 打开 `D:\AI工作台\localhost3000-static.html`。
2. 首页能显示 `Getrue.ai`、左侧导航、顶部栏。
3. 首页 hero 视频能播放。
4. 首页功能卡图片能显示。
5. 首页案例墙图片/视频能显示。
6. 点击 `大模型` 后显示截图式输入框页面。
7. 点击 `Inspiration` 和 `Deepseek V4` 能展开下拉。
8. 点击上传、麦克风、发送按钮只出现本地提示。
9. 点击其它模块时不展示功能页面。
10. 浏览器开发者工具 Network 中不应出现 `/api/`、`localhost:3006` 请求。

## 后续如果要接后台

如果之后要把静态页面改成真实接入 `D:\AI工作台\backend`，建议单独做，不要直接在当前静态复刻版中混写。

建议新增一层前端接口模块：

```text
apiBase
authApi
chatApi
imageApi
videoApi
```

并明确：

- 哪些按钮开始真实上传文件
- 哪些按钮请求麦克风
- 大模型使用哪个接口
- 是否需要登录态 Cookie
- 是否需要同源部署，避免跨域问题

当前版本适合作为“无后端展示版”或“前端视觉壳”使用。
