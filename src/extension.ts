import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import GPT3Tokenizer from "gpt3-tokenizer";

async function minifyDartWithFormat(srcCode: string): Promise<string> {
  return new Promise((res, rej) => {
    const tempInFile = path.join(__dirname, "temp.dart");
    fs.writeFileSync(tempInFile, srcCode);
    const dartFmt = cp.spawn("dart", [
      "format",
      "-o",
      "show",
      "--fix",
      tempInFile,
    ]);

    let fmtCode = "";
    let errOut = "";

    dartFmt.stdout.on("data", (data) => {
      fmtCode += data;
    });
    dartFmt.stderr.on("data", (data) => {
      errOut += data;
    });
    dartFmt.on("close", (code) => {
      fs.unlinkSync(tempInFile);
      if (code === 0) {
        const fmtCodeLines = fmtCode.trim().split("\n");
        const fmtCodeWithoutSummary = fmtCodeLines.slice(0, -1).join(" ");
        const minifiedCode = fmtCodeWithoutSummary
          .replace(/\/\/.*$/gm, "") // Remove line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
          .replace(/\s{2,}/g, " ") // Replace multiple spaces with a single space
          .replace(/ ?([\{\}\[\];,]) ?/g, "$1") // Remove spaces around punctuation
          .replace(/\n\s*\n/g, "\n") // Remove multiple newlines
          .trim();
        res(minifiedCode);
      } else {
        rej(new Error(`dart format failed: ${errOut}`));
      }
    });
  });
}

function minifyDartWithoutFormat(srcCode: string): string {
  const minifiedCode = srcCode
    .replace(/\/\/.*$/gm, "") // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
    .replace(/\s{2,}/g, " ") // Replace multiple spaces with a single space
    .replace(/ ?([\{\}\[\];,]) ?/g, "$1") // Remove spaces around punctuation
    .replace(/\n\s*\n/g, "\n") // Remove multiple newlines
    .trim();

  return minifiedCode;
}

async function minifySelCode() {
  const editor = vscode.window.activeTextEditor;

  if (editor) {
    const document = editor.document;
    const selection = editor.selection;

    if (!selection.isEmpty) {
      const sourceCode = document.getText(selection);
      const languageId = document.languageId;

      try {
        const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
        const originalEncoded = tokenizer.encode(sourceCode);
        const originalTokenCount = originalEncoded.bpe.length;

        let minifiedCode;

        if (languageId === "dart") {
          try {
            minifiedCode = await minifyDartWithFormat(sourceCode);
          } catch (error) {
            console.log("Error with dart format, trying without format.");
            minifiedCode = minifyDartWithoutFormat(sourceCode);
          }
        } else {
          throw new Error("Only Dart is supported.");
        }

        const minifiedEncoded = tokenizer.encode(minifiedCode);
        const minifiedTokenCount = minifiedEncoded.bpe.length;

        vscode.env.clipboard.writeText(minifiedCode);
        vscode.window.showInformationMessage(
          `✅Copied! Tokens: ${originalTokenCount} ➡️ ${minifiedTokenCount}`
        );
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(
            `Error minifying code: ${error.message}`
          );
        } else {
          vscode.window.showErrorMessage(
            `Error minifying code: ${String(error)}`
          );
        }
      }
    }
  }
}

async function minifySelCodeWithProblems() {
  const editor = vscode.window.activeTextEditor;

  if (editor) {
    const document = editor.document;
    const selection = editor.selection;

    if (!selection.isEmpty) {
      const sourceCode = document.getText(selection);
      const languageId = document.languageId;

      try {
        const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
        const originalEncoded = tokenizer.encode(sourceCode);
        const originalTokenCount = originalEncoded.bpe.length;

        let minifiedCode;

        if (languageId === "dart") {
          try {
            minifiedCode = await minifyDartWithFormat(sourceCode);
          } catch (error) {
            console.log("Error with dart format, trying without format.");
            minifiedCode = minifyDartWithoutFormat(sourceCode);
          }
        } else {
          throw new Error("Only Dart is supported.");
        }

        // Get the current errors from the Problems panel
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const errorMessages = diagnostics
          .filter(
            (diagnostic) =>
              diagnostic.severity === vscode.DiagnosticSeverity.Error
          )
          .map((diagnostic) => diagnostic.message)
          .join("\n");

        // Append the error messages to the minified code
        if (errorMessages) {
          minifiedCode += "\n\n/* Errors:\n" + errorMessages + "\n*/ Fix Code:";
        }

        const minifiedEncoded = tokenizer.encode(minifiedCode);
        const minifiedTokenCount = minifiedEncoded.bpe.length;

        vscode.env.clipboard.writeText(minifiedCode);
        vscode.window.showInformationMessage(
          `✅Copied! Tokens: ${originalTokenCount} ➡️ ${minifiedTokenCount}`
        );
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(
            `Error minifying code: ${error.message}`
          );
        } else {
          vscode.window.showErrorMessage(
            `Error minifying code: ${String(error)}`
          );
        }
      }
    }
  }
}

export function activate(ctx: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "copyminify.minify", // Ändern Sie dies, um es mit dem Namen im package.json abzugleichen
    minifySelCode,
    minifySelCodeWithProblems
  );

  // Add the information message here
  vscode.window.showInformationMessage("Hello World from copyifydfdf!");

  ctx.subscriptions.push(disposable);
}

export function deactivate() {}
