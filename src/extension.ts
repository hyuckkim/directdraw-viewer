import * as vscode from 'vscode';
import { generateHtmlFromRGBAArray, generateRGBAArrayFromDDS } from './htmlGenerator';
import { RGBAImage } from './parser';
import { rgbaToPngBytes } from './encoder';

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
  constructor(uri: vscode.Uri) { this.uri = uri; }
  dispose(): void {}
  static async create(uri: vscode.Uri): Promise<DdsDocument> {
    return new DdsDocument(uri);
  }
}

class DdsEditorProvider implements vscode.CustomEditorProvider<DdsDocument> {
  public readonly onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<DdsDocument>>;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<DdsDocument>>().event;
  }

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

    const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, "media", "index.html");
    let html = await vscode.workspace.fs.readFile(htmlPath);
    let template = Buffer.from(html).toString("utf-8");

    let content;
    let ddsInfo: RGBAImage[] | null = null;
    try {
      ddsInfo = await generateRGBAArrayFromDDS(document.uri.fsPath);
      content = generateHtmlFromRGBAArray(ddsInfo);
    }
    catch (e) {
      content = `<h1>Error parsing DDS file</h1><p>${e}`;
    }

    template = template.replace("<!-- IMAGES_PLACEHOLDER -->", content);

    webviewPanel.webview.html = template;

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "download") {
        const { index }: { index: number } = message;
        if (!ddsInfo) {
          return;
        }

        const uri = await vscode.window.showSaveDialog({
          filters: { "PNG Image": ["png"] },
          saveLabel: "Save DDS Image"
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, rgbaToPngBytes(ddsInfo[index].data, ddsInfo[index].width, ddsInfo[index].height));
          vscode.window.showInformationMessage(`Saved to ${uri.fsPath}`);
        }
      }
    });
  }

  async saveCustomDocument(
    _document: DdsDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
  }

  async saveCustomDocumentAs(
    _document: DdsDocument,
    _targetResource: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    throw new Error("Save As not supported");
  }

  async revertCustomDocument(
    _document: DdsDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
  }

  async backupCustomDocument(
    _document: DdsDocument,
    _context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    return {
      id: _document.uri.toString(),
      delete: () => {}
    };
  }
}
