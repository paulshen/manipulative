import babel from "@babel/core";
import generate from "@babel/generator";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as fs from "fs";
import prettier from "prettier";

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post("/update", async (req, res) => {
  const updates: Array<{ fileName: string; position: number; value: string }> =
    req.body.updates;
  const updatesByFile: Record<string, Array<[number, string]>> = {};
  updates.forEach(({ fileName, position, value }) => {
    if (updatesByFile[fileName] === undefined) {
      updatesByFile[fileName] = [];
    }
    updatesByFile[fileName].push([position, value]);
  });
  await Promise.all(
    Object.keys(updatesByFile).map(async (fileName) => {
      const file = await new Promise<string>((resolve, reject) => {
        fs.readFile(fileName, { encoding: "utf8" }, (err, contents) => {
          if (err !== null) {
            reject(err);
            return;
          }
          resolve(contents);
        });
      });
      const ast = await babel.parseAsync(file, {
        presets: ["@babel/preset-react"],
      });
      if (ast === null) {
        throw new Error(`Unable to parse file: ${file}`);
      }
      const t = babel.types;
      babel.traverse(ast, {
        CallExpression(path) {
          const positionUpdate = updatesByFile[fileName].find(
            ([position]) => path.node.start === position
          );
          if (positionUpdate !== undefined) {
            path.replaceWith(
              t.taggedTemplateExpression(
                t.identifier("css"),
                t.templateLiteral(
                  [t.templateElement({ raw: positionUpdate[1] }, true)],
                  []
                )
              )
            );
          }
        },
      });
      const output = generate(ast, {}, file);
      const formatted = prettier.format(output.code, { filepath: fileName });
      await new Promise<void>((resolve, reject) =>
        fs.writeFile(fileName, formatted, (err) => {
          if (err !== null) {
            reject(err);
            return;
          }
          resolve();
        })
      );
    })
  );
  res.sendStatus(200);
});

app.listen(3001);
