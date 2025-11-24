/**
 * Shared type definitions for the CompScript language server
 */

import { Range, Location } from "vscode-languageserver/node";

export interface FunctionMetadata {
  name: string;
  outputType: string;
  args?: FunctionArgument[];
  docs?: string;
  genericParams?: string[];
  isUserDefined?: boolean;
  location?: Location;
  nameRange?: Range;
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

export interface SymbolInfo {
  name: string;
  kind: string;
  location: Location;
  nameRange: Range;
}

export interface FunctionReference {
  name: string;
  location: Location;
  range: Range;
}
