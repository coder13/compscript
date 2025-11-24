import {
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  TextDocument,
} from "vscode-languageserver/node";
import { FunctionMetadata } from "./types";
import { getFunctionCallContext } from "./textUtils";

/**
 * Provides signature help for CompScript functions
 */
export class SignatureHelpProvider {
  constructor(
    private builtInFunctions: FunctionMetadata[],
    private getUserFunctions: (uri: string) => FunctionMetadata[]
  ) {}

  /**
   * Provides signature help at the given position
   */
  provide(document: TextDocument, offset: number): SignatureHelp | null {
    const text = document.getText();
    const context = getFunctionCallContext(text, offset);

    if (!context) {
      return null;
    }

    const signatures = this.buildSignatures(
      context.functionName,
      context.paramIndex,
      document.uri
    );

    if (signatures.length === 0) {
      return null;
    }

    return {
      signatures,
      activeSignature: 0,
      activeParameter: context.paramIndex,
    };
  }

  private buildSignatures(
    functionName: string,
    paramIndex: number,
    documentUri: string
  ): SignatureInformation[] {
    const signatures: SignatureInformation[] = [];

    // Add user-defined function signatures
    const userFunctions = this.getUserFunctions(documentUri).filter(
      (f) => f.name === functionName
    );
    userFunctions.forEach((fn) => {
      signatures.push(this.createSignature(fn, paramIndex, true));
    });

    // Add built-in function signatures
    const builtInFunctions = this.builtInFunctions.filter(
      (f) => f.name === functionName
    );
    builtInFunctions.forEach((fn) => {
      signatures.push(this.createSignature(fn, paramIndex, false));
    });

    return signatures;
  }

  private createSignature(
    fn: FunctionMetadata,
    paramIndex: number,
    isUserDefined: boolean
  ): SignatureInformation {
    const args = fn.args || [];
    const params: ParameterInformation[] = args.map((arg) => {
      const optional = arg.defaultValue !== undefined ? "?" : "";
      return {
        label: `${arg.name}${optional}: ${arg.type}`,
        documentation: arg.docs || "",
      };
    });

    const label = `${fn.name}(${params.map((p) => p.label).join(", ")}) -> ${
      fn.outputType
    }`;

    let documentation = fn.docs || "";
    if (isUserDefined) {
      documentation += "\n\n*User-defined function*";
    }

    return {
      label,
      documentation,
      parameters: params,
      activeParameter: Math.min(paramIndex, Math.max(0, params.length - 1)),
    };
  }
}
