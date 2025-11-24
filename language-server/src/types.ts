/**
 * Shared type definitions for the CompScript language server
 */

export interface FunctionMetadata {
  name: string;
  outputType: string;
  args?: FunctionArgument[];
  docs?: string;
  genericParams?: string[];
  isUserDefined?: boolean;
}

export interface FunctionArgument {
  name: string;
  type: string;
  defaultValue?: any;
  repeated?: boolean;
  canBeExternal?: boolean;
  nullable?: boolean;
  docs?: string;
}
