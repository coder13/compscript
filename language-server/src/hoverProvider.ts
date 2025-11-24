import { Hover, TextDocument } from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";
import { getWordAtPosition } from "./textUtils";

/**
 * Provides hover information for CompScript symbols
 */
export class HoverProvider {
  constructor(
    private builtInFunctions: FunctionMetadata[],
    private getUserFunctions: (uri: string) => FunctionMetadata[]
  ) {}

  /**
   * Provides hover information at the given position
   */
  provide(document: TextDocument, offset: number): Hover | null {
    const text = document.getText();
    const word = getWordAtPosition(text, offset);

    // Check user-defined functions first
    const userFn = this.getUserFunctions(document.uri).find(
      (f) => f.name === word
    );
    if (userFn) {
      return this.createHover(userFn, true);
    }

    // Check built-in functions
    const builtInFn = this.builtInFunctions.find((f) => f.name === word);
    if (builtInFn) {
      return this.createHover(builtInFn, false);
    }

    return null;
  }

  private createHover(fn: FunctionMetadata, isUserDefined: boolean): Hover {
    const args = fn.args || [];
    const argList = args
      .map((arg) => {
        const optional = arg.defaultValue !== undefined ? "?" : "";
        return `${arg.name}${optional}: ${arg.type}`;
      })
      .join(", ");

    let hover = `**${fn.name}**(${argList}) → ${fn.outputType}\n\n`;

    if (fn.docs) {
      hover += fn.docs + "\n\n";
    }

    if (args.length > 0) {
      hover += "**Parameters:**\n";
      args.forEach((arg) => {
        hover += `- \`${arg.name}\`: ${arg.type}`;
        if (arg.defaultValue !== undefined) hover += " (optional)";
        if (arg.repeated) hover += " (repeated)";
        if (arg.canBeExternal) hover += " (can be external)";
        hover += "\n";
      });
      hover += "\n";
    }

    if (isUserDefined) {
      hover += "*User-defined function*";
    }

    return {
      contents: {
        kind: "markdown",
        value: hover,
      },
    };
  }
}
