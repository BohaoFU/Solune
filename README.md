# Solune · 岁时万年历

**简体中文** | [English](README.en.md)

方便查看农历、节气、节假日与日期记事的日历应用。英文名 **Solune**，中文名 **岁时万年历**。

本仓库是项目入口与平台导航。**各平台使用独立仓库、独立源码和独立构建入口**，可以分别克隆、开发和发布。

## 平台工程

| 平台 | 独立仓库 | 当前状态 |
| --- | --- | --- |
| Android | [Solune-Android](https://github.com/BohaoFU/Solune-Android) | 已实现 v1.2.0，Android 8.0+；源码和完整离线资源均在该仓库 |
| Web | [Solune-Web](https://github.com/BohaoFU/Solune-Web) | 基础网页/PWA，可独立运行和静态部署 |
| Windows | [Solune-Windows](https://github.com/BohaoFU/Solune-Windows) | 待开发；当前只有说明，没有客户端源码或安装包 |

所有仓库的 README 都提供顶部的 **简体中文 / English** 切换链接。请进入对应平台仓库查看功能、源码结构与构建说明。

## Android 当前功能

- 1901—2100 年公历月历、农历、干支、生肖、节气和节日。
- 公农历双向转换，支持闰月；日期记事本机保存。
- 放假“休”、补班“班”标记，公开假日接口自动更新、手动刷新和离线缓存。
- 月历左右滑动、深浅主题、沉浸式底部导航。
- 网格和卡片式日期、年月、记事、帮助等弹窗。

![Android 弹窗预览](docs/assets/dialogs-preview.png)

Web 保留其独立的基础实现，暂不包含 Android 专用的假日更新和新版弹窗。Windows 后续在自己的仓库实现。

## 维护方式

各平台在自己的仓库管理提交、问题和版本；安装包可按平台通过各自的 GitHub Releases 分发。Android 的包名继续保留 `cn.suishi.calendar`，覆盖升级既有安装需使用原签名。

此前合并托管的源码可在本仓库历史提交中追溯；当前平台源码以各独立仓库为准。

## 数据与许可

已实现客户端的历法计算采用 [lunar-javascript](https://github.com/6tail/lunar-javascript)，各自保留 MIT 许可。Android 的假日安排来自[提莫公开接口](https://timor.tech/api/holiday/)，未公布年份不预测调休。具体依赖与许可见各平台 README。

主工程尚未指定开源许可证。
