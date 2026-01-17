# Changelog
All notable changes to the **DirectDraw Viewer** extension will be documented here.

---

## [Unreleased]

### New Features
- View DDS files one layer at a time in a clean main viewer.
- Added a thumbnail selector in the bottom‑right corner to switch between multiple layers easily.
- Each image now includes a **Download** button to save it as a PNG file.

### Improvements
- Refined the HTML template for more stable rendering.
- Improved communication between the Webview and the extension so the native save dialog appears when downloading.

---

## [0.0.1] - 2026-01-02

### Initial Release
- First public release of DirectDraw Viewer.
- Open `.dds` files directly in VS Code and display their layers.
- Basic DDS → PNG conversion and viewing functionality.


## [0.0.2] - 2026-01-03
- Remove unnecessary copies of DDS data.

## [0.0.3] - 2026-01-03
- Add simple metadata to top.
- Change default image size to real size (in big image). Can change to previous by resize button.

## [0.0.4] - 2026-01-17
- Add extension Icon.
- Support cubemaps and volume data on uncompressed images.
- Improved parsing speed for uncompressed images.