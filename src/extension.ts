import * as vscode from 'vscode';
import { ddsToRGBAArray, RGBAImage } from './parser';
import { rgbaToDataURL, rgbaToPngBytes } from './encoder';
import { DdsMetadata, parseDDS } from './parsedds';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'directdraw-viewer.ddsViewer',
      new DdsEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
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
}

class DdsEditorProvider implements vscode.CustomReadonlyEditorProvider<DdsDocument> {

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
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = (await this.getTemplate())
    .replace("<!-- IMAGES_PLACEHOLDER -->",
      document.renderedHTML
    );

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "download") {
        const { index }: { index: number } = message;

        const uri = await vscode.window.showSaveDialog({
          filters: { "PNG Image": ["png"] },
          defaultUri: vscode.Uri.file(document.uri.path + ".png")
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, rgbaToPngBytes(
            document.content[index].data,
            document.content[index].width,
            document.content[index].height
          ));
          vscode.window.showInformationMessage(`Saved to ${uri.fsPath}`);
        }
      }
    });
  }

  private async getTemplate(): Promise<string> {
    const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, "media", "index.html");
    let html = await vscode.workspace.fs.readFile(htmlPath);
    let template = Buffer.from(html).toString("utf-8");
    return template;
  }
}
