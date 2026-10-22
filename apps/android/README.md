# Solune Android · 岁时万年历

Android 8.0 及以上，包名 `cn.suishi.calendar`，版本 `1.2.0`（versionCode 3）。沿用原签名，可直接覆盖升级并保留记事。

这是独立安装的 Android 应用。系统 WebView 加载 APK 内置的 HTML、CSS、JavaScript 与农历数据，不要求登录。农历和记事离线可用；原生后台线程通过 HTTPS 获取公开的年度放假/补班数据。仅增加 INTERNET 普通权限，不上传记事或其他个人内容。

## 功能

- 1901—2100 年农历、公历月历与日期详情。
- 二十四节气、传统节日、全年查询。
- 公农历双向转换，含闰月。
- 本地日期记事，深浅主题。
- 手机与平板响应式布局，农历和本地记事离线可用。
- 自定义年月底部面板：年份分组、12 个月网格、回到本月。
- 放假“休”、调休“班”标记及日期详情，内置 2002—2026 年数据，联网自动更新新年份。
- 节日年份、农历年月日使用网格面板；公历日期使用含农历的日历面板，含闰月选择。
- 查询、记事、删除确认、帮助、开源许可统一使用卡片式底部面板，适配深浅色和多层返回。
- 月历左右滑动切换月份，保留上下滚动，处理跨年、查询边界和滑动后防误点。
- 底部导航与系统手势区连为一体，使用真实系统安全边距，兼顾深浅主题及输入法。

2026 年全部 39 条放假/调休记录已对照[国务院办公厅通知](https://www.beijing.gov.cn/zhengce/zhengcefagui/202511/t20251104_4258873.html)逐条核验。

记事通过仅向内置页面开放的 `SuishiStorage` 接口，存入应用内部的 SharedPreferences，写盘成功后才显示保存完成。强制结束进程或普通覆盖升级可保留；卸载应用或清除应用数据会删除。与浏览器网页版的记事分别保存。

## 假日自动更新

使用[提莫公共节假日 API](https://timor.tech/api/holiday/)，无需注册或 API Key。主域名 `timor.tech`，请求失败时尝试该服务的 `timor.cn` 域名，只按年份查询，不传记事。完整年度数据校验后写入本机缓存，优先于内置数据。未公布的空数据、格式错误或网络失败都不会覆盖已保存的有效安排。

成功的年度数据每 24 小时最多自动刷新一次；未收录年份每 6 小时重试；网络失败间隔 30 分钟。日历底部和帮助中可手动更新，同一年手动请求间隔至少 15 秒。未来年份由该第三方根据官方通知收录后自动获取，不预测调休。

## 构建

安装 JDK 17、Android SDK Platform 35 与相应 Build Tools，在 `local.properties` 中配置 `sdk.dir`，或设置 `ANDROID_HOME`。

```sh
./gradlew :app:assembleDebug
```

没有外部运行时库依赖。内置完整离线页面，源码包可以直接构建，无需先运行网页项目。

正式签名构建时，在项目根目录创建 `signing.properties`：

```properties
storeFile=.keys/suishi-release.jks
storePassword=你的密钥库密码
keyAlias=suishi
keyPassword=你的密钥密码
```

随后运行 `./gradlew :app:assembleRelease`。正式签名材料不在本公开仓库中；既有 APK 的原签名仍保留在原本地工程，维护者需单独配置。以后升级同一安装包必须保留原签名，不要重新生成覆盖，也不要提交密钥或密码。

`prepare-assets.py` 从相邻的 `../web/dist` 更新基础页面，移除网页安装入口、外部字体和 Service Worker，再复制 `android-assets/` 内的专用界面与样式。源码包含生成好的完整资源，直接构建即可。

## 验证

本次完整记录见 `VALIDATION-v1.2.0.md`；此前的 VALIDATION 文件保留历史记录。`node verify-holidays.cjs` 可独立检查 2026 年内置放假调休数据。

```sh
./gradlew :app:assembleRelease :app:assembleReleaseAndroidTest
adb -s <device> install -r app/build/outputs/apk/release/app-release.apk
adb -s <device> install -r app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
adb -s <device> shell am instrument -w cn.suishi.calendar.test/cn.suishi.calendar.CalendarSmokeTest
adb -s <device> shell am instrument -w -e stage repository cn.suishi.calendar.test/cn.suishi.calendar.CalendarSmokeTest
adb -s <device> shell am instrument -w -e stage network cn.suishi.calendar.test/cn.suishi.calendar.CalendarSmokeTest
adb -s <device> shell am instrument -w -e stage write-persistence cn.suishi.calendar.test/cn.suishi.calendar.CalendarSmokeTest
adb -s <device> shell am force-stop cn.suishi.calendar
adb -s <device> shell am instrument -w -e stage read-persistence cn.suishi.calendar.test/cn.suishi.calendar.CalendarSmokeTest
```

测试使用与正式版相同的签名，需配置上述本地签名文件。农历和历史放假调休数据使用 MIT 授权的 lunar-javascript 1.7.7，许可位于 `app/src/main/assets/calendar/vendor/LICENSE-lunar.txt`。节日名称与放假、调休标记分别显示；部分群体的半天假不单独推算。
