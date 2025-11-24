/**
 * Core interfaces for the CompScript language server
 */

import { TextDocument } from "vscode-languageserver-textdocument";
import {
  CompletionItem,
  Diagnostic,
  Hover,
  SignatureHelp,
} from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";

/**
 * Context information for a cursor position
 */
export interface PositionContext {
  readonly document: TextDocument;
  readonly offset: number;
  readonly text: string;
}

/**
 * Information about a function call at cursor position
 */
export interface FunctionCallContext {
  readonly functionName: string;
  readonly paramIndex: number;
  readonly expectedType: string | null;
}

/**
 * Service for managing function metadata
 */
export interface IFunctionRegistry {
  getBuiltInFunctions(): FunctionMetadata[];
  getUserFunctions(documentUri: string): FunctionMetadata[];
  findFunction(name: string, documentUri?: string): FunctionMetadata | null;
  updateUserFunctions(documentUri: string, functions: FunctionMetadata[]): void;
}

/**
 * Service for analyzing source code context
 */
export interface IContextAnalyzer {
  getWordAtPosition(context: PositionContext): string;
  getFunctionCallContext(context: PositionContext): FunctionCallContext | null;
}

/**
 * Service for type matching and compatibility
 */
export interface ITypeSystem {
  matches(actualType: string, expectedType: string): boolean;
  functionMatches(fn: FunctionMetadata, expectedType: string): boolean;
}

/**
 * Provider for LSP completion feature
 */
export interface ICompletionProvider {
  provide(context: PositionContext): CompletionItem[];
  resolve(item: CompletionItem): CompletionItem;
}

/**
 * Provider for LSP hover feature
 */
export interface IHoverProvider {
  provide(context: PositionContext): Hover | null;
}

/**
 * Provider for LSP signature help feature
 */
export interface ISignatureHelpProvider {
  provide(context: PositionContext): SignatureHelp | null;
}

/**
 * Provider for LSP diagnostics
 */
export interface IDiagnosticsProvider {
  validate(document: TextDocument): Promise<Diagnostic[]>;
}

/**
 * Service for loading CompScript resources
 */
export interface IResourceLoader {
  load(logger: (message: string) => void): void;
  getParser(): any;
  getFunctions(): FunctionMetadata[];
}
