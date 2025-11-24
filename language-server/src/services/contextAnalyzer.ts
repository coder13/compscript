import {
  IFunctionRegistry,
  IContextAnalyzer,
  PositionContext,
  FunctionCallContext,
} from "../interfaces";
import { FunctionMetadata } from "../types";

/**
 * Service for analyzing source code to understand context
 * Single responsibility: Parse text and determine cursor context
 */
export class ContextAnalyzer implements IContextAnalyzer {
  constructor(private functionRegistry: IFunctionRegistry) {}

  getWordAtPosition(context: PositionContext): string {
    const { text, offset } = context;
    let start = offset;
    let end = offset;

    while (start > 0 && /[a-zA-Z_]/.test(text[start - 1])) {
      start--;
    }
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) {
      end++;
    }

    return text.substring(start, end);
  }

  getFunctionCallContext(context: PositionContext): FunctionCallContext | null {
    const { text, offset, document } = context;
    const functionStart = this.findFunctionStart(text, offset);

    if (functionStart === -1) {
      return null;
    }

    const functionName = this.extractFunctionName(text, functionStart);
    const paramIndex = this.calculateParameterIndex(
      text,
      functionStart,
      offset
    );
    const expectedType = this.getExpectedType(
      functionName,
      paramIndex,
      document.uri
    );

    return { functionName, paramIndex, expectedType };
  }

  private findFunctionStart(text: string, offset: number): number {
    let depth = 0;

    for (let i = offset - 1; i >= 0; i--) {
      if (text[i] === ")") depth++;
      if (text[i] === "(") {
        depth--;
        if (depth < 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private extractFunctionName(text: string, openParenPos: number): string {
    let nameEnd = openParenPos;
    let nameStart = openParenPos - 1;

    while (nameStart >= 0 && /[a-zA-Z0-9_]/.test(text[nameStart])) {
      nameStart--;
    }
    nameStart++;

    return text.substring(nameStart, nameEnd);
  }

  private calculateParameterIndex(
    text: string,
    functionStart: number,
    offset: number
  ): number {
    let paramIndex = 0;
    let depth = 0;

    for (let i = functionStart + 1; i < offset; i++) {
      if (text[i] === "(") depth++;
      if (text[i] === ")") depth--;
      if (text[i] === "," && depth === 0) paramIndex++;
    }

    return paramIndex;
  }

  private getExpectedType(
    functionName: string,
    paramIndex: number,
    documentUri: string
  ): string | null {
    const fn = this.functionRegistry.findFunction(functionName, documentUri);

    if (!fn || !fn.args || paramIndex >= fn.args.length) {
      return null;
    }

    return fn.args[paramIndex].type;
  }
}
