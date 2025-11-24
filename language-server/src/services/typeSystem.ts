import { ITypeSystem } from "../interfaces";
import { FunctionMetadata } from "../types";

/**
 * Type system for CompScript type matching
 * Single responsibility: Determine type compatibility
 */
export class TypeSystem implements ITypeSystem {
  matches(actualType: string, expectedType: string): boolean {
    if (!expectedType) return true;
    if (actualType === expectedType) return true;

    // Handle generic types (e.g., "Array<Person>" matches "Array<T>")
    const expectedBase = expectedType.split("<")[0];
    const actualBase = actualType.split("<")[0];
    if (expectedBase === actualBase) return true;

    // Handle repeated parameters
    if (expectedType.startsWith("Array<")) {
      const innerType = expectedType.slice(6, -1);
      return actualType === innerType || actualType === expectedType;
    }

    return false;
  }

  functionMatches(fn: FunctionMetadata, expectedType: string): boolean {
    if (!expectedType) return true;

    // Check if expected type is a function type like "Boolean(Person)"
    const functionTypeMatch = expectedType.match(/^(\w+)\(([^)]*)\)$/);

    if (functionTypeMatch) {
      return this.matchesFunctionType(fn, functionTypeMatch);
    }

    return this.matches(fn.outputType, expectedType);
  }

  private matchesFunctionType(
    fn: FunctionMetadata,
    match: RegExpMatchArray
  ): boolean {
    const [, returnType, paramTypes] = match;
    const params = paramTypes ? paramTypes.split(",").map((p) => p.trim()) : [];

    // Check return type
    if (fn.outputType !== returnType) {
      return false;
    }

    const fnArgs = fn.args || [];

    if (params.length > 0) {
      if (fnArgs.length === 0) return false;

      const firstParam = fnArgs[0];
      // Match if parameter type matches AND it can be external (curried)
      if (firstParam.type === params[0] && firstParam.canBeExternal) {
        return true;
      }

      // Match if all expected params are covered
      if (fnArgs.length >= params.length) {
        return params.every(
          (expectedParam, idx) =>
            fnArgs[idx] && fnArgs[idx].type === expectedParam
        );
      }
    }

    return false;
  }
}
