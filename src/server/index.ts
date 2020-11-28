import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as fs from "fs";
import prettier from "prettier";

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post("/commit", async (req, res) => {
  const updates: Array<{ fileName: string; position: number; value: string }> =
    req.body.updates;
  const updatesByFile: Record<
    string,
    Array<[position: number, value: string]>
  > = {};
  updates.forEach(({ fileName, position, value }) => {
    if (updatesByFile[fileName] === undefined) {
      updatesByFile[fileName] = [];
    }
    updatesByFile[fileName].push([position, value]);
  });
  await Promise.all(
    Object.keys(updatesByFile).map(async (fileName) => {
      const contents = await new Promise<string>((resolve, reject) => {
        fs.readFile(fileName, { encoding: "utf8" }, (err, contents) => {
          if (err !== null) {
            reject(err);
            return;
          }
          resolve(contents);
        });
      });
      // get updates in reverse order
      const updates = updatesByFile[fileName]
        .slice()
        .sort(([aPos], [bPos]) => bPos - aPos);
      let newContents = contents;
      updates.forEach(([position, value]) => {
        const isCssPlaceholderProp =
          newContents.substring(position, position + "css__".length) ===
          "css__";
        if (isCssPlaceholderProp) {
          newContents = `${newContents.substring(
            0,
            position
          )}css={css\`${value}\`}${newContents.substring(
            position + "css__".length
          )}`;
          return;
        }
        const nextParen = newContents.indexOf(")", position);
        newContents = `${newContents.substring(
          0,
          position
        )}css\`${value}\`${newContents.substring(nextParen + 1)}`;
      });
      const formatted = prettier.format(newContents, { filepath: fileName });
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
