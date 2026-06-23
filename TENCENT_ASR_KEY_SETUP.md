# 腾讯云 ASR 密钥与权限配置说明

这份文档用于让同事在腾讯云控制台开通语音识别 ASR，并提供项目需要的密钥配置。

## 需要同事提供的信息

请提供以下 3 个值：

```env
TENCENTCLOUD_SECRET_ID=
TENCENTCLOUD_SECRET_KEY=
TENCENTCLOUD_REGION=ap-guangzhou
```

其中：

- `TENCENTCLOUD_SECRET_ID`：腾讯云 API 密钥 ID
- `TENCENTCLOUD_SECRET_KEY`：腾讯云 API 密钥 Key
- `TENCENTCLOUD_REGION`：地域，当前项目默认使用 `ap-guangzhou`

注意：`SecretKey` 通常只在创建密钥时展示一次，请创建后立即保存。

## 1. 开通腾讯云语音识别 ASR

打开腾讯云语音识别控制台：

[https://console.cloud.tencent.com/asr](https://console.cloud.tencent.com/asr)

进入后确认语音识别服务已经开通。

如果没有开通，请按页面提示完成开通。

项目当前使用的是录音文件识别能力，对应接口为：

`CreateRecTask`

接口文档：

[https://cloud.tencent.com/document/product/1093/37823](https://cloud.tencent.com/document/product/1093/37823)

## 2. 获取 API 密钥

打开腾讯云 API 密钥管理页面：

[https://console.cloud.tencent.com/cam/capi](https://console.cloud.tencent.com/cam/capi)

操作方式：

1. 登录腾讯云控制台。
2. 进入 API 密钥管理页面。
3. 如果已有可用密钥，可以复制 `SecretId`。
4. 如果没有密钥，点击“新建密钥”。
5. 创建后保存 `SecretId` 和 `SecretKey`。

官方文档：

[https://cloud.tencent.com/document/product/598/40488](https://cloud.tencent.com/document/product/598/40488)

## 3. 如果使用子账号，需要配置权限

如果密钥属于子账号，需要确认该子账号具备语音识别 ASR 权限。

访问 CAM 用户管理：

[https://console.cloud.tencent.com/cam](https://console.cloud.tencent.com/cam)

操作方式：

1. 进入访问管理 CAM。
2. 找到对应子用户。
3. 进入“权限”或“关联策略”。
4. 添加语音识别 ASR 相关权限。

至少需要允许以下接口：

```text
asr:CreateRecTask
asr:DescribeTaskStatus
```

如果不确定具体策略，可以先给该子账号关联腾讯云提供的语音识别相关预设策略，或由管理员添加自定义策略。

之前遇到过的权限错误示例：

```json
{
  "error": "you are not authorized to perform operation (asr:CreateRecTask)"
}
```

出现这个错误说明当前密钥所属账号没有调用录音文件识别接口的权限。

## 4. 项目中如何替换

拿到同事提供的密钥后，修改项目后端环境变量文件：

```text
backend/.env
```

替换以下内容：

```env
TENCENTCLOUD_SECRET_ID=同事提供的SecretId
TENCENTCLOUD_SECRET_KEY=同事提供的SecretKey
TENCENTCLOUD_REGION=ap-guangzhou
```

如果项目里有 ASR 专用地域，也可以配置：

```env
TENCENTCLOUD_ASR_REGION=ap-guangzhou
```

修改后需要重启后端服务。

## 5. 项目还需要公网媒体地址

腾讯云录音文件识别需要能够访问音频文件。

项目后端还需要配置公网访问地址：

```env
PUBLIC_BASE_URL=https://你的域名
PUBLIC_MEDIA_BASE_URL=https://你的域名/media
```

如果缺少这个配置，项目可能会报：

```json
{
  "error": "PUBLIC_MEDIA_BASE_URL or PUBLIC_BASE_URL is required for Ark asset upload"
}
```

如果音频文件不能被公网访问，可能会报：

```json
{
  "error": "Failed to download audio file!"
}
```

## 6. 给同事的最终确认清单

请同事确认：

- 腾讯云语音识别 ASR 已开通。
- API 密钥已创建，并提供 `SecretId` 和 `SecretKey`。
- 如果是子账号密钥，已授权 ASR 调用权限。
- 至少允许 `CreateRecTask` 和 `DescribeTaskStatus`。
- 密钥不要发到公开群或提交到代码仓库。

