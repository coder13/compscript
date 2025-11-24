import { FunctionMetadata } from "./types";

/**
 * Text parsing utilities for finding context in CompScript code
 */

/**
 * Extracts the word at a given offset in text
 */
export function getWordAtPosition(text: string, offset: number): string {
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

/**
 * Finds the function call context at the cursor position
 */
export function getFunctionCallContext(
  text: string,
  offset: number
): { functionName: string; paramIndex: number } | null {
  const functionStart = findFunctionStart(text, offset);
  if (functionStart === -1) {
    return null;
  }

  const functionName = extractFunctionName(text, functionStart);
  const paramIndex = calculateParameterIndex(text, functionStart, offset);

  return { functionName, paramIndex };
}

/**
 * Determines the expected type at cursor position
 */
export function getExpectedTypeAtPosition(
  text: string,
  offset: number,
  allFunctions: FunctionMetadata[]
): string | null {
  const context = getFunctionCallContext(text, offset);
  if (!context) {
    return null;
  }

  const matchingFunction = allFunctions.find(
    (f) => f.name === context.functionName
  );

  if (!matchingFunction || !matchingFunction.args) {
    return null;
  }

  const param = matchingFunction.args[context.paramIndex];
  return param ? param.type : null;
}

/**
 * Finds the start of the current function call
 */
function findFunctionStart(text: string, offset: number): number {
  let depth = 0;
  let functionStart = -1;

  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === ")") depth++;
    if (text[i] === "(") {
      depth--;
      if (depth < 0) {
        functionStart = i;
        break;
      }
    }
  }

  return functionStart;
}

/**
 * Extracts the function name before an opening parenthesis
 */
function extractFunctionName(text: string, openParenPosition: number): string {
  let nameEnd = openParenPosition;
  let nameStart = openParenPosition - 1;

  while (nameStart >= 0 && /[a-zA-Z0-9_]/.test(text[nameStart])) {
    nameStart--;
  }
  nameStart++;

  return text.substring(nameStart, nameEnd);
}

/**
 * Calculates which parameter index the cursor is at
 */
function calculateParameterIndex(
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
