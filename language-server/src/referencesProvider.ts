import { Location, Range, TextDocument } from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";

/**
 * Provides "Find All References" for CompScript symbols
 */
export class ReferencesProvider {
  constructor(
    private builtInFunctions: FunctionMetadata[],
    private getUserFunctions: (uri: string) => FunctionMetadata[]
  ) {}

  /**
   * Finds all references to the symbol at the given position
   */
  provide(
    document: TextDocument,
    offset: number,
    includeDeclaration: boolean
  ): Location[] {
    const wordRange = this.getWordRangeAtOffset(document, offset);
    if (!wordRange) {
      return [];
    }

    const word = document.getText(wordRange);
    const references: Location[] = [];

    // Check if it's a known function (built-in or user-defined)
    const isBuiltIn = this.builtInFunctions.some((fn) => fn.name === word);
    const userFunction = this.getUserFunctions(document.uri).find(
      (fn) => fn.name === word
    );

    if (!isBuiltIn && !userFunction) {
      return [];
    }

    // Find all occurrences in the document
    const text = document.getText();
    const occurrences = this.findAllOccurrences(text, word);

    for (const occurrence of occurrences) {
      const startPos = document.positionAt(occurrence.start);
      const endPos = document.positionAt(occurrence.end);
      const range = Range.create(startPos, endPos);

      // If includeDeclaration is false and this is the declaration, skip it
      if (
        !includeDeclaration &&
        userFunction &&
        userFunction.nameRange &&
        this.rangesEqual(range, userFunction.nameRange)
      ) {
        continue;
      }

      references.push(Location.create(document.uri, range));
    }

    return references;
  }

  /**
   * Finds all occurrences of a word in text
   */
  private findAllOccurrences(
    text: string,
    word: string
  ): Array<{ start: number; end: number }> {
    const occurrences: Array<{ start: number; end: number }> = [];
    const wordRegex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, "g");
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      occurrences.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return occurrences;
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

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Checks if two ranges are equal
   */
  private rangesEqual(r1: Range, r2: Range): boolean {
    return (
      r1.start.line === r2.start.line &&
      r1.start.character === r2.start.character &&
      r1.end.line === r2.end.line &&
      r1.end.character === r2.end.character
    );
  }
}
