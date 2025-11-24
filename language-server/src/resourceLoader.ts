import * as fs from "fs";
import * as path from "path";
import { extractFunctionMetadata } from "./functionExtractor";
import { FunctionMetadata } from "./types";

/**
 * Manages loading of CompScript resources (parser and functions)
 */
export class ResourceLoader {
  private workspacePath: string;
  private parser: any = null;
  private allFunctions: FunctionMetadata[] = [];

  constructor(serverDir: string) {
    this.workspacePath = path.join(serverDir, "../..");
  }

  /**
   * Loads parser and built-in functions
   */
  load(logger: (message: string) => void): void {
    this.loadParser(logger);
    this.loadFunctions(logger);
  }

  getParser(): any {
    return this.parser;
  }

  getFunctions(): FunctionMetadata[] {
    return this.allFunctions;
  }

  private loadParser(logger: (message: string) => void): void {
    const parserPath = path.join(this.workspacePath, "parser", "parser.js");

    try {
      if (fs.existsSync(parserPath)) {
        this.parser = require(parserPath);
        logger("Parser loaded successfully");
      } else {
        logger(`Parser not found at: ${parserPath}`);
      }
    } catch (error) {
      logger(`Error loading parser: ${error}`);
    }
  }

  private loadFunctions(logger: (message: string) => void): void {
    const functionsPath = path.join(
      this.workspacePath,
      "functions",
      "functions.js"
    );

    try {
      if (fs.existsSync(functionsPath)) {
        const functionsModule = require(functionsPath);
        this.allFunctions = functionsModule.allFunctions || [];
        logger(`Loaded ${this.allFunctions.length} functions via require`);
      }
    } catch (error) {
      // Direct require failed - fall back to extraction
      try {
        this.allFunctions = extractFunctionMetadata(this.workspacePath);
        logger(
          `Extracted ${this.allFunctions.length} function definitions from source`
        );
      } catch (extractError) {
        logger(`Error extracting function metadata: ${extractError}`);
        this.allFunctions = [];
      }
    }
  }
}
