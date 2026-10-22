# Solune · 岁时万年历

[简体中文](README.md) | **English**

A calendar app for Chinese lunar dates, solar terms, holidays and date notes. The English name is **Solune**; the Chinese name remains **岁时万年历**.

This repository is the project hub. **Each platform has its own repository, source code and build entry point**, so it can be cloned, developed and released independently.

## Platform projects

| Platform | Independent repository | Current status |
| --- | --- | --- |
| Android | [Solune-Android](https://github.com/BohaoFU/Solune-Android) | v1.2.0 implemented, Android 8.0+; includes complete source and offline assets |
| Web | [Solune-Web](https://github.com/BohaoFU/Solune-Web) | Basic standalone Web/PWA, ready for static hosting |
| Windows | [Solune-Windows](https://github.com/BohaoFU/Solune-Windows) | Planned; documentation only, no client source or installer yet |

Every repository provides **简体中文 / English** links at the top of its README. Open the relevant platform repository for features, source layout and build instructions.

## Current Android features

- Gregorian and Chinese lunar calendars for 1901–2100, cyclical dates, zodiac, solar terms and festivals.
- Gregorian/lunar conversion with leap months, and locally stored date notes.
- Holiday and adjusted workday markers, public-API updates, manual refresh and offline caching.
- Swipe to change months, light/dark themes and edge-to-edge bottom navigation.
- Grid and card dialogs for dates, years/months, notes and help.

![Android dialog preview](docs/assets/dialogs-preview.png)

Web retains its independent basic implementation; it does not yet include Android-specific holiday updates or the newer dialogs. Windows will be implemented in its own repository.

## Maintenance

Commits, issues, versions and future GitHub Releases are managed separately for each platform. Android keeps the `cn.suishi.calendar` application ID; upgrading an existing installation requires the original signing key.

The earlier combined source remains accessible in this repository's Git history. Current platform source is maintained in the independent repositories linked above.

## Data and licenses

Implemented clients use [lunar-javascript](https://github.com/6tail/lunar-javascript) and retain its MIT license in each repository. Android retrieves holiday schedules from the [Timor public API](https://timor.tech/api/holiday/) and does not predict unpublished adjusted workdays. See each platform's README for its dependencies and licenses.

The main application does not yet specify an open-source license.
