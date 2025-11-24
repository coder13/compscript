import { IFunctionRegistry } from "../interfaces";
import { FunctionMetadata } from "../types";

/**
 * Central registry for all function metadata
 * Single responsibility: Manage function lookups
 */
export class FunctionRegistry implements IFunctionRegistry {
  private builtInFunctions: FunctionMetadata[] = [];
  private userDefinedFunctions = new Map<string, FunctionMetadata[]>();

  setBuiltInFunctions(functions: FunctionMetadata[]): void {
    this.builtInFunctions = functions;
  }

  getBuiltInFunctions(): FunctionMetadata[] {
    return this.builtInFunctions;
  }

  getUserFunctions(documentUri: string): FunctionMetadata[] {
    return this.userDefinedFunctions.get(documentUri) || [];
  }

  findFunction(name: string, documentUri?: string): FunctionMetadata | null {
    // Check user-defined functions first if documentUri provided
    if (documentUri) {
      const userFn = this.getUserFunctions(documentUri).find(
        (f) => f.name === name
      );
      if (userFn) return userFn;
    }

    // Check built-in functions
    return this.builtInFunctions.find((f) => f.name === name) || null;
  }

  updateUserFunctions(
    documentUri: string,
    functions: FunctionMetadata[]
  ): void {
    this.userDefinedFunctions.set(documentUri, functions);
  }

  getAllFunctions(documentUri: string): FunctionMetadata[] {
    return [...this.builtInFunctions, ...this.getUserFunctions(documentUri)];
  }
}
