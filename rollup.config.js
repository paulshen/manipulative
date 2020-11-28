import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import path from "path";

const { root } = path.parse(process.cwd());
const external = (id) =>
  !id.startsWith(".") && !id.startsWith(root) && id !== "tslib";
const extensions = [".js", ".ts", ".tsx"];
const getBabelOptions = (targets) => {
  const config = {
    ignore: ["./node_modules"],
    presets: [
      [
        "@babel/preset-env",
        {
          loose: true,
          targets,
        },
      ],
      ["@emotion/babel-preset-css-prop", { sourceMap: false }],
    ],
    plugins: [
      "@babel/plugin-transform-react-jsx",
      ["@babel/plugin-transform-typescript", { isTSX: true }],
    ],
    babelHelpers: "bundled",
    sourceMaps: false,
  };
  if (targets.ie) {
    config.plugins = [
      ...config.plugins,
      "@babel/plugin-transform-regenerator",
      ["@babel/plugin-transform-runtime", { helpers: true, regenerator: true }],
    ];
    config.babelHelpers = "runtime";
  }
  return {
    ...config,
    extensions,
  };
};

function createESMConfig(input, output) {
  return {
    input,
    output: { file: output, format: "esm" },
    external,
    plugins: [
      resolve({ extensions }),
      babel(getBabelOptions({ node: 8 })),
      typescript(),
    ],
  };
}

function createCommonJSExecutableConfig(input, output) {
  return {
    input,
    output: {
      file: output,
      format: "cjs",
      banner: "#!/usr/bin/env node",
    },
    external,
    plugins: [
      resolve({ extensions }),
      babel(getBabelOptions({ node: 8 })),
      typescript(),
    ],
  };
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: output, format: "cjs", exports: "named" },
    external,
    plugins: [
      resolve({ extensions }),
      babel(getBabelOptions({ ie: 11 })),
      typescript(),
    ],
  };
}

export default [
  createESMConfig("src/client.ts", "dist/client.js"),
  createCommonJSConfig("src/client.ts", "dist/client.cjs.js"),
  createCommonJSExecutableConfig("src/server.ts", "dist/server.js"),
  createCommonJSConfig("src/plugin.ts", "dist/plugin.js"),
];
