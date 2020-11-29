import { NodePath, PluginObj, PluginPass } from "@babel/core";
import * as t from "@babel/types";

function processReferencePaths(referencePaths: NodePath[], state: PluginPass) {
  if (referencePaths !== undefined) {
    referencePaths.forEach((path) => {
      const callExpressionNode = path.parentPath.node;
      if (!t.isCallExpression(callExpressionNode)) {
        return;
      }

      const filename = state.file.opts.filename;
      const start = callExpressionNode.start;
      if (filename != null && start != null) {
        callExpressionNode.arguments = [
          t.arrayExpression([
            t.stringLiteral(filename),
            t.numericLiteral(start),
            ...(path.node.loc !== null
              ? [
                  t.numericLiteral(path.node.loc.start.line),
                  t.stringLiteral(
                    state.file.code.split("\n")[path.node.loc.start.line - 1]
                  ),
                ]
              : []),
          ]),
        ];
      }
    });
  }
}

function babelPlugin(): PluginObj {
  return {
    visitor: {
      Program(path, state) {
        let needsImport = false;
        const USECSSPLACEHOLDER_IDENTIFIER_NAME = "useCssPlaceholder__INJECT";
        const fileLines = state.file.code.split("\n");

        // We're traversing here early before react-refresh does hook extraction.
        // https://github.com/facebook/react/blob/e6a0f276307fcb2f1c5bc41d630c5e4c9e95a037/packages/react-refresh/src/ReactFreshBabelPlugin.js#L721
        path.traverse({
          JSXAttribute(path) {
            const propName = path.node.name;
            if (!t.isJSXIdentifier(propName) || propName.name !== "css__") {
              return;
            }
            needsImport = true;

            // TODO: check container for other props named css and warn
            propName.name = "css";
            const filename = state.file.opts.filename!;
            const start = path.node.start!;
            path.node.value = t.jsxExpressionContainer(
              t.callExpression(
                t.identifier(USECSSPLACEHOLDER_IDENTIFIER_NAME),
                [
                  t.arrayExpression([
                    t.stringLiteral(filename),
                    t.numericLiteral(start),
                    ...(path.node.loc !== null
                      ? [
                          t.numericLiteral(path.node.loc.start.line),
                          t.stringLiteral(
                            fileLines[path.node.loc.start.line - 1]
                          ),
                        ]
                      : []),
                  ]),
                ]
              )
            );
          },
        });

        if (needsImport) {
          path.unshiftContainer("body", [
            t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier(USECSSPLACEHOLDER_IDENTIFIER_NAME),
                  t.identifier("useCssPlaceholder")
                ),
              ],
              t.stringLiteral("manipulative")
            ),
          ]);
        }
      },

      ImportDeclaration(path, state) {
        if (path.node.source.value !== "manipulative") {
          return;
        }
        const imports = path.node.specifiers.map((s) => ({
          localName: s.local.name,
          importedName:
            s.type === "ImportDefaultSpecifier"
              ? "default"
              : ((s as t.ImportSpecifier).imported as t.Identifier).name,
        }));
        let shouldExit = false;
        let hasReferences = false;
        const referencePathsByImportName = imports.reduce(
          (byName: Record<string, NodePath[]>, { importedName, localName }) => {
            let binding = path.scope.getBinding(localName);
            if (!binding) {
              shouldExit = true;
              return byName;
            }
            byName[importedName] = binding.referencePaths;
            hasReferences =
              hasReferences || Boolean(byName[importedName].length);
            return byName;
          },
          {}
        );
        if (!hasReferences || shouldExit) {
          return;
        }
        processReferencePaths(
          referencePathsByImportName["useCssPlaceholder"],
          state
        );
      },
    },
  };
}

module.exports = babelPlugin;
