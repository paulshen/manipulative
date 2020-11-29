import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as fs from "fs";
import prettier from "prettier";

const app = express();
app.use(bodyParser.json());
app.use(cors());

type Update = [position: number, value: string];

const PROP_PLACEHOLDER = "css__";

function readFile(fileName: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(fileName, { encoding: "utf8" }, (err, contents) => {
      if (err !== null) {
        reject(err);
        return;
      }
      resolve(contents);
    });
  });
}

function replacePlaceholder(
  contents: string,
  position: number,
  propValue: string,
  cssValue: string
): string {
  const isCssPlaceholderProp =
    contents.substring(position, position + PROP_PLACEHOLDER.length) ===
    PROP_PLACEHOLDER;
  if (isCssPlaceholderProp) {
    return `${contents.substring(0, position)}${propValue}${contents.substring(
      position + PROP_PLACEHOLDER.length
    )}`;
  }
  const nextCloseParen = contents.indexOf(")", position);
  return `${contents.substring(0, position)}${cssValue}${contents.substring(
    nextCloseParen + 1
  )}`;
}

async function processFile(fileName: string, updates: Array<Update>) {
  const contents = await readFile(fileName);
  let newContents = contents;
  let didAddCssCall = false;

  // Good ol' text manipulation here. We can process the AST using Babel but
  // it'll be harder to preserve formatting.
  updates
    .slice()
    // process updates from back to front
    .sort(([aPos], [bPos]) => bPos - aPos)
    .forEach(([position, value]) => {
      if (value.trim() === "") {
        newContents = replacePlaceholder(
          newContents,
          position,
          "",
          "undefined"
        );
        return;
      }
      newContents = replacePlaceholder(
        newContents,
        position,
        `css={css\`${value}\`}`,
        `css\`${value}\``
      );
      didAddCssCall = true;
    });

  if (didAddCssCall) {
    if (newContents.indexOf("@emotion/react") === -1) {
      newContents = `import {css} from '@emotion/react';\n${newContents}`;
    }
  }

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
}

app.post("/commit", async (req, res) => {
  const updates: Array<{ fileName: string; position: number; value: string }> =
    req.body.updates;
  const updatesByFile: Record<string, Array<Update>> = {};
  updates.forEach(({ fileName, position, value }) => {
    if (updatesByFile[fileName] === undefined) {
      updatesByFile[fileName] = [];
    }
    updatesByFile[fileName].push([position, value]);
  });
  try {
    await Promise.all(
      Object.keys(updatesByFile).map((fileName) =>
        processFile(fileName, updatesByFile[fileName])
      )
    );
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
});

app.listen(process.env.REACT_APP_MANIPULATIVE_PORT ?? 3001);
