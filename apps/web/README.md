# Solune Web · 岁时万年历

现有的基础网页/PWA 版本。纯静态应用，包含农历月历、节气与节日、公农历转换、本地记事及深浅主题。

在本目录执行：

```sh
python3 -m http.server 5173 --directory dist
```

打开 <http://localhost:5173>。静态部署目录为 `dist`，不依赖原托管平台的账户或部署配置。

记事保存在当前浏览器的 localStorage，清除站点数据后会删除。该目录是基础网页实现；Android 的自动放假/补班更新、原生记事存储、手势与新弹窗实现位于相邻的 `android` 工程。

历法使用 MIT 授权的 lunar-javascript 1.7.7，许可位于 `dist/vendor/LICENSE-lunar.txt`。日期以中国标准时间为准；网页里的节日名称不代表实际放假或补班安排。
