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
          ]),
        ];
      }
    });
  }
}

function babelPlugin(): PluginObj {
  return {
    visitor: {
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
        processReferencePaths(
          referencePathsByImportName["useClassNamePlaceholder"],
          state
        );
      },
    },
  };
}

export = babelPlugin;
