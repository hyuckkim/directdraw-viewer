import * as vscode from 'vscode';
import { ddsToRGBAArray, RGBAImage } from './parser';
import { rgbaToDataURL, rgbaToPngBytes } from './encoder';
import { DdsMetadata } from './parsedds';

export function activate(context: vscode.ExtensionContext) {
  const provider = new DdsEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'directdraw-viewer.ddsViewer',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('ddsViewer.copyImage', async () => {
      const activeDoc = provider.getActiveDocument();
      if (!activeDoc) {
        vscode.window.showErrorMessage("No active DDS document.");
        return;
      }
      activeDoc.webviewPanel.reveal(
      activeDoc.webviewPanel.viewColumn,
      true);
      activeDoc.webviewPanel.webview.postMessage({
        type: "copy",
      });
    })
  );
}

class DdsDocument implements vscode.CustomDocument {
  uri: vscode.Uri;

  data: Uint8Array;
  metadata: DdsMetadata;
  content: RGBAImage[];

  constructor(uri: vscode.Uri, data: Uint8Array, metadata: DdsMetadata, content: RGBAImage[]) {
    this.uri = uri;
    this.data = data;
    this.metadata = metadata;
    this.content = content;
  }
  dispose(): void {}

  static async create(uri: vscode.Uri): Promise<DdsDocument> {
    const data = await vscode.workspace.fs.readFile(uri);
    const { metadata, content } = ddsToRGBAArray(data);

    return new DdsDocument(uri, data, metadata, content);
  }
  get renderedDataURL(): string[] {
    return this.content.map((img) =>
      rgbaToDataURL(img.data, img.width, img.height)
    );
  }
  get renderedHTML(): string {
    return this.renderedDataURL.map((url, index) => {
      return `<img src="${url}" width="${this.content[index].width}" height="${this.content[index].height}" class="dds-image"/>`;
    }).join("");
  }
  get renderedPNGBytes(): Uint8Array[] {
    return this.content.map((img) =>
      rgbaToPngBytes(img.data, img.width, img.height)
    );
  }
}

interface DdsEditor {
  document: DdsDocument;
  webviewPanel: vscode.WebviewPanel;
}

class DdsEditorProvider implements vscode.CustomReadonlyEditorProvider<DdsDocument> {
  private readonly _openDocs = new Set<DdsEditor>();
  private _activeDoc: DdsEditor | undefined;

  constructor(private readonly context: vscode.ExtensionContext) { }

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<DdsDocument> {
    return DdsDocument.create(uri);
  }

  async resolveCustomEditor(
    document: DdsDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const editor: DdsEditor = { document, webviewPanel };
    this._openDocs.add(editor);
    this._activeDoc = editor;

    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = (await this.getTemplate())
    .replace('<!-- IMAGES_PLACEHOLDER -->', document.renderedHTML)
    .replace('/*METADATA_PLACEHOLDER*/',
      `setMetadata(${JSON.stringify(document.metadata)});`
    );
    webviewPanel.onDidDispose(() => {
      this._openDocs.delete(editor);
      if (this._activeDoc === editor) {
        this._activeDoc = undefined;
      }
    });
    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        this._activeDoc = editor;
      } else if (this._activeDoc === editor && !e.webviewPanel.active) {
        this._activeDoc = undefined;
      }
    });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "ready":
          webviewPanel.webview.postMessage({
            type: "load",
            metadata: document.metadata
          });
        break;
        case "download":
          await this.downloadPNG(
            vscode.Uri.file(document.uri.path + ".png"),
            document.content[message.index]
          );
        break;
      }
    });
  }
  public getActiveDocument(): DdsEditor | undefined {
    return this._activeDoc;
  }

  private async downloadPNG(defaultUri: vscode.Uri, img: RGBAImage) {
    const uri = await vscode.window.showSaveDialog({
      filters: { "PNG Image": ["png"] },
      defaultUri: defaultUri,
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, rgbaToPngBytes(
        img.data,
        img.width,
        img.height
      ));
      vscode.window.showInformationMessage(`Saved to ${uri.fsPath}`);
    }
  }

  private async getTemplate(): Promise<string> {
    const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, "media", "index.html");
    let html = await vscode.workspace.fs.readFile(htmlPath);
    let template = Buffer.from(html).toString("utf-8");
    return template;
  }
}
