import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentPositionParams,
  ReferenceParams,
  DocumentSymbolParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { ResourceLoader } from "./resourceLoader";
import { extractUserDefinedFunctions } from "./userFunctions";
import { CompletionProvider } from "./completionProvider";
import { HoverProvider } from "./hoverProvider";
import { SignatureHelpProvider } from "./signatureHelpProvider";
import { DiagnosticsProvider } from "./diagnosticsProvider";
import { DocumentSymbolProvider } from "./documentSymbolProvider";
import { DefinitionProvider } from "./definitionProvider";
import { ReferencesProvider } from "./referencesProvider";
import { FunctionMetadata } from "./types";

// Create server connection
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Server state
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// Resource management
const resourceLoader = new ResourceLoader(__dirname);
const userDefinedFunctions = new Map<string, FunctionMetadata[]>();

// Service providers
let completionProvider: CompletionProvider;
let hoverProvider: HoverProvider;
let signatureHelpProvider: SignatureHelpProvider;
let diagnosticsProvider: DiagnosticsProvider;
let documentSymbolProvider: DocumentSymbolProvider;
let definitionProvider: DefinitionProvider;
let referencesProvider: ReferencesProvider;

// Initialize server
connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ["(", ",", "_"],
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", ","],
      },
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }

  // Load CompScript resources
  resourceLoader.load((msg) => connection.console.log(msg));

  // Initialize service providers
  const getUserFunctions = (uri: string) => userDefinedFunctions.get(uri) || [];

  completionProvider = new CompletionProvider(
    resourceLoader.getFunctions(),
    getUserFunctions
  );

  hoverProvider = new HoverProvider(
    resourceLoader.getFunctions(),
    getUserFunctions
  );

  signatureHelpProvider = new SignatureHelpProvider(
    resourceLoader.getFunctions(),
    getUserFunctions
  );

  diagnosticsProvider = new DiagnosticsProvider(
    resourceLoader.getParser(),
    hasDiagnosticRelatedInformationCapability
  );

  documentSymbolProvider = new DocumentSymbolProvider(getUserFunctions);

  definitionProvider = new DefinitionProvider(getUserFunctions);

  referencesProvider = new ReferencesProvider(
    resourceLoader.getFunctions(),
    getUserFunctions
  );
});

// Document change handlers
documents.onDidOpen((event) => {
  updateUserDefinedFunctions(event.document);
  validateDocument(event.document);
});

documents.onDidChangeContent((change) => {
  updateUserDefinedFunctions(change.document);
  validateDocument(change.document);
});

function updateUserDefinedFunctions(document: TextDocument): void {
  const functions = extractUserDefinedFunctions(document);
  userDefinedFunctions.set(document.uri, functions);

  if (functions.length > 0) {
    connection.console.log(
      `Found ${functions.length} user-defined functions: ${functions
        .map((f) => `${f.name}(${f.args?.map((a) => a.type).join(", ") || ""})`)
        .join(", ")}`
    );
  }
}

async function validateDocument(document: TextDocument): Promise<void> {
  const diagnostics = await diagnosticsProvider.validate(document);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

// LSP feature handlers
connection.onCompletion((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const offset = document.offsetAt(params.position);
  return completionProvider.provide(document, offset);
});

connection.onCompletionResolve((item) => {
  return completionProvider.resolve(item);
});

connection.onHover((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const offset = document.offsetAt(params.position);
  return hoverProvider.provide(document, offset);
});

connection.onSignatureHelp((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const offset = document.offsetAt(params.position);
  return signatureHelpProvider.provide(document, offset);
});

connection.onDocumentSymbol((params: DocumentSymbolParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  return documentSymbolProvider.provide(document);
});

connection.onDefinition((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const offset = document.offsetAt(params.position);
  return definitionProvider.provide(document, offset);
});

connection.onReferences((params: ReferenceParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const offset = document.offsetAt(params.position);
  return referencesProvider.provide(
    document,
    offset,
    params.context.includeDeclaration
  );
});

connection.onDidChangeWatchedFiles((_change) => {
  connection.console.log("File change event received");
});

// Start listening
documents.listen(connection);
connection.listen();
