import { TextDocument } from "vscode-languageserver-textdocument";
import { FunctionMetadata } from "./types";

/**
 * Extracts user-defined functions from a CompScript document
 */
export function extractUserDefinedFunctions(
  textDocument: TextDocument
): FunctionMetadata[] {
  const text = textDocument.getText();
  const functions: FunctionMetadata[] = [];

  // Find Define("FunctionName", body) calls
  const defineRegex =
    /Define\s*\(\s*"([^"]+)"\s*,\s*([^)]+(?:\([^)]*\))*[^)]*)\s*\)/gs;
  let match;

  while ((match = defineRegex.exec(text)) !== null) {
    const functionName = match[1];
    const functionBody = match[2];

    // Extract argument definitions from the body: {number, Type}
    const args = extractArguments(functionBody);

    functions.push({
      name: functionName,
      outputType: "Any",
      args,
      docs: `User-defined function: ${functionName}`,
      isUserDefined: true,
    });
  }

  return functions;
}

/**
 * Extracts argument definitions from function body
 */
function extractArguments(functionBody: string): FunctionMetadata["args"] {
  const args: any[] = [];
  const argRegex = /\{\s*(\d+)\s*,\s*([^}]+)\s*\}/g;
  let argMatch;

  while ((argMatch = argRegex.exec(functionBody)) !== null) {
    const argNumber = parseInt(argMatch[1]);
    const argType = argMatch[2].trim();

    // Ensure array is large enough
    while (args.length < argNumber) {
      args.push(null);
    }

    args[argNumber - 1] = {
      name: `arg${argNumber}`,
      type: argType,
      canBeExternal: false,
    };
  }

  // Filter out null entries
  return args.filter((arg) => arg !== null);
}
