const compiler = require("c-preprocessor");
const fs = require("fs");
const { DateTime } = require("luxon");

const functions = require("./functions/functions");
const parser = require("./parser/parser");
const perf = require("./perf");

/**
 * Execute a compscript and return the results
 * @param {object} competition - WCIF competition object
 * @param {string} script - Script content to execute
 * @param {string|null} filename - Optional filename for #include
 * @param {boolean} dryrun - Whether to run in dry-run mode
 * @param {boolean} clearCache - Whether cache was cleared
 * @returns {Promise<{outputs: Array, mutations: Array}>}
 */
async function executeScript(
  competition,
  script,
  filename,
  dryrun,
  clearCache
) {
  const logger = new perf.PerfLogger();

  // Prepend filename if provided
  if (filename) {
    script = `#include "${filename}"\n${script}`;
  }

  // Auto-import if configured
  if (process.env.AUTO_IMPORT) {
    script = `#include "${process.env.AUTO_IMPORT}"\n${script}`;
  }

  return new Promise((resolve, reject) => {
    compiler.compile(
      script,
      {
        basePath: process.env.SCRIPT_BASE + "/",
        newLine: "\r\n",
      },
      async (err, newScript) => {
        if (err) {
          resolve({
            outputs: [{ type: "Error", data: err }],
            mutations: [],
          });
          return;
        }

        newScript = newScript.trim();
        const ctx = {
          competition: competition,
          command: newScript,
          allFunctions: functions.allFunctions,
          dryrun: dryrun,
          logger,
          udfs: {},
        };

        try {
          logger.start("parse");
          const scriptResult = await parser.parse(
            newScript,
            null,
            null,
            ctx,
            false
          );
          logger.stop("parse");

          resolve({
            outputs: scriptResult.outputs || [],
            mutations: scriptResult.mutations || [],
          });
        } catch (e) {
          resolve({
            outputs: [{ type: "Exception", data: e.stack }],
            mutations: [],
          });
        }
      }
    );
  });
}

/**
 * Format an output object for terminal display
 * @param {object} output - Output object with type and data
 * @returns {string} Formatted string for terminal
 */
function formatOutputForTerminal(output) {
  if (output.data === null) {
    return "null";
  }

  switch (output.type) {
    case "Error":
      return `ERROR:\n${JSON.stringify(output.data, null, 2)}`;

    case "InputParseError":
    case "GrammarParseError":
      return formatParseError(output.data);

    case "Exception":
      return `EXCEPTION:\n${output.data}`;

    case "String":
    case "Number":
      return String(output.data);

    case "Boolean":
      return output.data.toString();

    case "Header":
      return `\n=== ${output.data} ===`;

    case "Table":
      return formatTable(output.data);

    case "ClusteringResult":
      return formatClusteringResult(output.data);

    case "GroupAssignmentResult":
      return formatGroupAssignment(output.data);

    case "StaffAssignmentResult":
      return formatStaffAssignment(output.data);

    case "ReadSpreadsheetResult":
      return formatSpreadsheet(output.data);

    case "AttemptResult":
      return output.data.toString();

    case "Multi":
      return output.data
        .map((data) => formatOutputForTerminal(data))
        .join("\n");

    case "Person":
      return output.data.name;

    case "DateTime":
      return output.data.toLocaleString(DateTime.DATETIME_MED);

    case "Date":
      return output.data.toLocaleString(DateTime.DATE_FULL);

    case "Event":
      return output.data.eventId;

    case "NoPageBreak":
      return output.data
        .map((data) => formatOutputForTerminal(data))
        .join("\n");

    case "ListFunctionsOutput":
      return formatListFunctions(output.data);

    case "FunctionHelp":
      return formatFunctionHelp(output.data);

    case "ListScriptsOutput":
      return formatListScripts(output.data);

    case "CompetitionWCIF":
      return `Competition WCIF (${output.data.name})`;

    default:
      // Handle Array<T> and Tuple<T> types
      if (output.type.startsWith("Array<")) {
        const innerType = output.type.substring(6, output.type.length - 1);
        return output.data
          .map((item) =>
            formatOutputForTerminal({ type: innerType, data: item })
          )
          .join("\n");
      }

      if (output.type.startsWith("Tuple<")) {
        const innerTypes = output.type
          .substring(6, output.type.length - 1)
          .split(",");
        return output.data
          .map((item, idx) =>
            formatOutputForTerminal({
              type: innerTypes[idx].trim(),
              data: item,
            })
          )
          .join(", ");
      }

      return JSON.stringify(output.data);
  }
}

function formatTable(data) {
  if (!data.rows || data.rows.length === 0) {
    return "(empty table)";
  }

  const headers = data.headers || [];
  const rows = data.rows || [];

  // Calculate column widths
  const colWidths = headers.map((header, idx) => {
    const headerLen = String(header).length;
    const maxDataLen = Math.max(
      ...rows.map((row) => String(row[idx] || "").length)
    );
    return Math.max(headerLen, maxDataLen);
  });

  // Format header
  const headerRow = headers
    .map((h, idx) => String(h).padEnd(colWidths[idx]))
    .join(" | ");
  const separator = colWidths.map((w) => "-".repeat(w)).join("-+-");

  // Format rows
  const dataRows = rows.map((row) =>
    row
      .map((cell, idx) => String(cell || "").padEnd(colWidths[idx]))
      .join(" | ")
  );

  return [headerRow, separator, ...dataRows].join("\n");
}

function formatParseError(error) {
  let output = "PARSE ERROR:\n";
  if (error.location) {
    output += `  at line ${error.location.start.line}, column ${error.location.start.column}\n`;
  }
  output += `  ${error.message || error.toString()}`;
  return output;
}

function formatClusteringResult(data) {
  let output = "Clustering Result:\n";
  if (data.clusters) {
    data.clusters.forEach((cluster, idx) => {
      output += `  Cluster ${idx + 1}: ${cluster.length} items\n`;
    });
  }
  return output;
}

function formatGroupAssignment(data) {
  let output = "Group Assignment:\n";
  if (data.groups) {
    Object.keys(data.groups).forEach((groupKey) => {
      output += `  ${groupKey}: ${data.groups[groupKey].length} people\n`;
    });
  }
  return output;
}

function formatStaffAssignment(data) {
  let output = "Staff Assignment:\n";
  if (data.assignments) {
    Object.keys(data.assignments).forEach((role) => {
      output += `  ${role}: ${data.assignments[role].length} people\n`;
    });
  }
  return output;
}

function formatSpreadsheet(data) {
  if (data.rows) {
    return formatTable({ headers: data.headers, rows: data.rows });
  }
  return JSON.stringify(data);
}

function formatListFunctions(data) {
  let output = "Available Functions:\n";
  if (Array.isArray(data)) {
    data.forEach((fn) => {
      output += `  ${fn.name}${fn.signature || ""}\n`;
      if (fn.description) {
        output += `    ${fn.description}\n`;
      }
    });
  }
  return output;
}

function formatFunctionHelp(data) {
  let output = `Function: ${data.name}\n`;
  if (data.description) {
    output += `\n${data.description}\n`;
  }
  if (data.signature) {
    output += `\nSignature: ${data.signature}\n`;
  }
  if (data.examples) {
    output += `\nExamples:\n${data.examples}\n`;
  }
  return output;
}

function formatListScripts(data) {
  let output = "Available Scripts:\n";
  if (Array.isArray(data)) {
    data.forEach((script) => {
      output += `  ${script}\n`;
    });
  }
  return output;
}

module.exports = {
  executeScript,
  formatOutputForTerminal,
};
