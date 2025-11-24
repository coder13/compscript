import {
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";
import { getExpectedTypeAtPosition } from "./textUtils";
import { functionMatchesType, typeMatches } from "./typeMatching";

/**
 * Provides completion items for CompScript
 */
export class CompletionProvider {
  constructor(
    private builtInFunctions: FunctionMetadata[],
    private getUserFunctions: (uri: string) => FunctionMetadata[]
  ) {}

  /**
   * Provides completion items at the given position
   */
  provide(document: TextDocument, offset: number): CompletionItem[] {
    const text = document.getText();
    const expectedType = getExpectedTypeAtPosition(
      text,
      offset,
      this.builtInFunctions
    );

    const completions: CompletionItem[] = [];

    this.addFunctionCompletions(completions, expectedType);
    this.addUserFunctionCompletions(completions, document.uri);
    this.addLiteralCompletions(completions, expectedType);

    return completions;
  }

  /**
   * Resolves additional information for completion items
   */
  resolve(item: CompletionItem): CompletionItem {
    if (item.data !== undefined && this.builtInFunctions[item.data]) {
      const fn = this.builtInFunctions[item.data];
      item.documentation = this.buildFunctionDocumentation(fn);
    }
    return item;
  }

  private addFunctionCompletions(
    completions: CompletionItem[],
    expectedType: string | null
  ): void {
    this.builtInFunctions.forEach((fn, index) => {
      if (expectedType && !functionMatchesType(fn, expectedType)) {
        return;
      }

      completions.push({
        label: fn.name,
        kind: CompletionItemKind.Function,
        data: index,
        detail: this.formatFunctionSignature(fn),
        documentation: fn.docs || `Function: ${fn.name}`,
      });
    });
  }

  private addUserFunctionCompletions(
    completions: CompletionItem[],
    documentUri: string
  ): void {
    const userFunctions = this.getUserFunctions(documentUri);

    userFunctions.forEach((fn, index) => {
      completions.push({
        label: fn.name,
        kind: CompletionItemKind.Function,
        data: `user:${index}`,
        detail: this.formatFunctionSignature(fn),
        documentation: fn.docs,
      });
    });
  }

  private addLiteralCompletions(
    completions: CompletionItem[],
    expectedType: string | null
  ): void {
    if (!expectedType || typeMatches("Event", expectedType)) {
      this.addEventLiterals(completions);
    }

    if (!expectedType || typeMatches("Boolean", expectedType)) {
      this.addBooleanLiterals(completions);
    }

    if (!expectedType || typeMatches("Time", expectedType)) {
      this.addTimeLiterals(completions);
    }
  }

  private addEventLiterals(completions: CompletionItem[]): void {
    const events = [
      "_222",
      "_333",
      "_444",
      "_555",
      "_666",
      "_777",
      "_333bf",
      "_333fm",
      "_333oh",
      "_clock",
      "_minx",
      "_pyram",
      "_skewb",
      "_sq1",
      "_444bf",
      "_555bf",
      "_333mbf",
    ];

    events.forEach((event) => {
      completions.push({
        label: event,
        kind: CompletionItemKind.Constant,
        detail: "Event literal",
        documentation: `WCA Event: ${event}`,
      });
    });
  }

  private addBooleanLiterals(completions: CompletionItem[]): void {
    completions.push(
      {
        label: "true",
        kind: CompletionItemKind.Keyword,
        detail: "Boolean literal",
      },
      {
        label: "false",
        kind: CompletionItemKind.Keyword,
        detail: "Boolean literal",
      }
    );
  }

  private addTimeLiterals(completions: CompletionItem[]): void {
    completions.push(
      {
        label: "DNF",
        kind: CompletionItemKind.Constant,
        detail: "Did Not Finish",
      },
      {
        label: "DNS",
        kind: CompletionItemKind.Constant,
        detail: "Did Not Start",
      }
    );
  }

  private formatFunctionSignature(fn: FunctionMetadata): string {
    const args = fn.args || [];
    const argList = args
      .map((arg) => {
        const optional = arg.defaultValue !== undefined ? "?" : "";
        return `${arg.name}${optional}: ${arg.type}`;
      })
      .join(", ");

    return `${fn.name}(${argList}) -> ${fn.outputType}`;
  }

  private buildFunctionDocumentation(fn: FunctionMetadata): string {
    let documentation = fn.docs || "";

    if (fn.args && fn.args.length > 0) {
      documentation += "\n\nParameters:\n";
      fn.args.forEach((arg) => {
        const optional = arg.defaultValue !== undefined ? " (optional)" : "";
        const repeated = arg.repeated ? " (repeated)" : "";
        const external = arg.canBeExternal ? " (can be external)" : "";
        documentation += `- ${arg.name}: ${arg.type}${optional}${repeated}${external}\n`;
        if (arg.docs) {
          documentation += `  ${arg.docs}\n`;
        }
      });
    }

    documentation += `\nReturns: ${fn.outputType}`;

    if (fn.genericParams && fn.genericParams.length > 0) {
      documentation += `\nGeneric Parameters: ${fn.genericParams.join(", ")}`;
    }

    return documentation;
  }
}
