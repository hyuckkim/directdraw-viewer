# DirectDraw Viewer

DirectDraw Viewer is a Visual Studio Code extension that lets you open and explore **DDS (DirectDraw Surface)** files directly inside the editor.  
It provides a clean, layer‑by‑layer view of DDS textures and makes it easy to inspect or export them as PNG images.

---

## ✨ Features

- Open `.dds` files with a **custom editor** in VS Code.
- View DDS textures **one layer at a time** in the main viewer.
- Switch between multiple layers using a **thumbnail selector** in the bottom‑right corner.
- Save any layer as a **PNG file** with the built‑in download button.
- Powered by [parse-dds](https://www.npmjs.com/package/parse-dds), [dxt-js](https://www.npmjs.com/package/dxt-js), and [pngjs](https://www.npmjs.com/package/pngjs).

---

## 🚀 Usage

1. Install the extension from the VS Code Marketplace.
2. Open a `.dds` file in VS Code.
3. Choose **“DirectDraw Viewer”** when prompted to select an editor.
4. Use the thumbnail selector to switch layers.
5. Click the **Download** button to save the current layer as PNG.

---

## 🛠️ Requirements

- Visual Studio Code `^1.80.0` or later.
- No additional dependencies required.

---

## 📦 Extension Settings

This extension does not contribute any settings at the moment.

---

## 📝 Known Issues

- Large DDS files may take longer to parse and render.
- Only standard DDS formats supported by `parse-dds` are currently handled

---

## 📄 Release Notes

### 0.0.1
- Initial release with basic DDS viewing and PNG export.

---

## 💡 Contributing

If you encounter issues or have feature requests, please open an issue on [GitHub](https://github.com/yourname/directdraw-viewer).

---

## 📜 License

MIT
