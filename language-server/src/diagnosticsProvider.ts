import {
  Diagnostic,
  DiagnosticSeverity,
  TextDocument,
} from "vscode-languageserver/node";

/**
 * Provides diagnostics for CompScript documents
 */
export class DiagnosticsProvider {
  constructor(private parser: any, private hasDiagnosticRelatedInfo: boolean) {}

  /**
   * Validates a document and returns diagnostics
   */
  async validate(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this.parser) {
      return [];
    }

    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    try {
      this.parser.parse(text);
    } catch (e: any) {
      diagnostics.push(this.createDiagnostic(e, textDocument));
    }

    return diagnostics;
  }

  private createDiagnostic(error: any, textDocument: TextDocument): Diagnostic {
    const text = textDocument.getText();
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(error.location?.start?.offset || 0),
        end: textDocument.positionAt(
          error.location?.end?.offset || text.length
        ),
      },
      message: error.message || "Syntax error",
      source: "compscript",
    };

    if (this.hasDiagnosticRelatedInfo && error.expected) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: `Expected: ${error.expected.join(", ")}`,
        },
      ];
    }

    return diagnostic;
  }
}
