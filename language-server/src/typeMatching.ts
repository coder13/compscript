import { FunctionMetadata } from "./types";

/**
 * Type matching utilities for CompScript types
 */

/**
 * Checks if a function matches the expected type signature
 */
export function functionMatchesType(
  fn: FunctionMetadata,
  expectedType: string
): boolean {
  if (!expectedType) return true;

  // Check if expected type is a function type like "Boolean(Person)"
  const functionTypeMatch = expectedType.match(/^(\w+)\(([^)]*)\)$/);

  if (functionTypeMatch) {
    return matchesFunctionType(fn, functionTypeMatch);
  }

  // Not a function type, do regular type matching
  return typeMatches(fn.outputType, expectedType);
}

/**
 * Matches function signature against function type notation
 */
function matchesFunctionType(
  fn: FunctionMetadata,
  match: RegExpMatchArray
): boolean {
  const [, returnType, paramTypes] = match;
  const params = paramTypes ? paramTypes.split(",").map((p) => p.trim()) : [];

  // Check if function returns the expected type
  if (fn.outputType !== returnType) {
    return false;
  }

  const fnArgs = fn.args || [];

  // Function can have optional params, but must accept at least the required ones
  if (params.length > 0) {
    if (fnArgs.length === 0) return false;

    const firstParam = fnArgs[0];
    // Match if the parameter type matches AND it can be external (curried)
    if (firstParam.type === params[0] && firstParam.canBeExternal) {
      return true;
    }

    // Also match if all expected params are covered
    if (fnArgs.length >= params.length) {
      return params.every(
        (expectedParam, idx) =>
          fnArgs[idx] && fnArgs[idx].type === expectedParam
      );
    }
  }

  return false;
}

/**
 * Checks if a type matches the expected type
 */
export function typeMatches(actualType: string, expectedType: string): boolean {
  if (!expectedType) return true;

  // Exact match
  if (actualType === expectedType) return true;

  // Handle generic types (e.g., "Array<Person>" matches "Array<T>")
  const expectedBase = expectedType.split("<")[0];
  const actualBase = actualType.split("<")[0];
  if (expectedBase === actualBase) return true;

  // Handle repeated parameters (type can be the element type or array of it)
  if (expectedType.startsWith("Array<")) {
    const innerType = expectedType.slice(6, -1);
    return actualType === innerType || actualType === expectedType;
  }

  return false;
}
