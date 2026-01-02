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
  content: RGBAImage[] | null = null;
  constructor(uri: vscode.Uri) { this.uri = uri; }
  dispose(): void {}
  static async create(uri: vscode.Uri): Promise<DdsDocument> {
    const document = new DdsDocument(uri);
    document.content = await generateRGBAArrayFromDDS(uri.fsPath);
    return document;
  }
}

class DdsEditorProvider implements vscode.CustomReadonlyEditorProvider<DdsDocument> {
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

    template = template.replace("<!-- IMAGES_PLACEHOLDER -->", 
      generateHtmlFromRGBAArray(document.content || [])
    );

    webviewPanel.webview.html = template;

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "download") {
        const { index }: { index: number } = message;
        if (!document.content) {
          return;
        }

        const uri = await vscode.window.showSaveDialog({
          filters: { "PNG Image": ["png"] },
          saveLabel: "Save DDS Image"
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
}
