import { NodePath } from "@babel/core";
import * as t from "@babel/types";
import { createMacro } from "babel-plugin-macros";
import { processReferencePaths } from "./plugin/index";

module.exports = createMacro(({ references, state, babel }) => {
  const t = babel.types;
  processReferencePaths(references["useCssPlaceholder"], state);
  if (
    references["useCssPlaceholder"] !== undefined &&
    references["useCssPlaceholder"].length > 0
  ) {
    let pathIter = references["useCssPlaceholder"][0];
    while (pathIter.parentPath !== null) {
      pathIter = pathIter.parentPath;
    }
    (pathIter as NodePath<t.Program>).unshiftContainer("body", [
      t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier("useCssPlaceholder"),
            t.identifier("useCssPlaceholder")
          ),
        ],
        t.stringLiteral("manipulative")
      ),
    ]);
  }
});
