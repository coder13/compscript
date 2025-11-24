import { Location, TextDocument } from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";

/**
 * Provides "Go to Definition" for CompScript symbols
 */
export class DefinitionProvider {
  constructor(private getUserFunctions: (uri: string) => FunctionMetadata[]) {}

  /**
   * Provides definition location for the symbol at the given position
   */
  provide(document: TextDocument, offset: number): Location | null {
    const wordRange = this.getWordRangeAtOffset(document, offset);
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);

    // Search for user-defined function with this name
    const userFunctions = this.getUserFunctions(document.uri);
    const userFunction = userFunctions.find(
      (fn) => fn.name === word && fn.location
    );

    if (userFunction && userFunction.location) {
      return userFunction.location;
    }

    return null;
  }

  /**
   * Gets the word range at the given offset
   */
  private getWordRangeAtOffset(document: TextDocument, offset: number) {
    const text = document.getText();

    // Find word boundaries
    let start = offset;
    let end = offset;

    // Move start backwards to find word start
    while (start > 0 && this.isWordChar(text[start - 1])) {
      start--;
    }

    // Move end forwards to find word end
    while (end < text.length && this.isWordChar(text[end])) {
      end++;
    }

    if (start === end) {
      return null;
    }

    return {
      start: document.positionAt(start),
      end: document.positionAt(end),
    };
  }

  /**
   * Checks if a character is part of a word (function name)
   */
  private isWordChar(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }
}
