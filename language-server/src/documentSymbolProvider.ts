import {
  DocumentSymbol,
  SymbolKind,
  TextDocument,
} from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";

/**
 * Provides document symbols for CompScript files
 */
export class DocumentSymbolProvider {
  constructor(private getUserFunctions: (uri: string) => FunctionMetadata[]) {}

  /**
   * Provides document symbols for the given document
   */
  provide(document: TextDocument): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    const userFunctions = this.getUserFunctions(document.uri);

    for (const func of userFunctions) {
      if (func.location && func.nameRange) {
        const symbol: DocumentSymbol = {
          name: func.name,
          kind: SymbolKind.Function,
          range: func.location.range,
          selectionRange: func.nameRange,
          detail: this.buildDetail(func),
        };

        symbols.push(symbol);
      }
    }

    return symbols;
  }

  private buildDetail(func: FunctionMetadata): string {
    const params = func.args
      ?.map((arg) => `${arg.name}: ${arg.type}`)
      .join(", ");
    return `${func.name}(${params || ""}) -> ${func.outputType}`;
  }
}
