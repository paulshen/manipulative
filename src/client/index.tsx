import { css } from "@emotion/css";
import { EventEmitter } from "events";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";

let inspectorCallsites: Record<string, [value: string, hover: boolean]> = {};
const inspectorEmitter = new EventEmitter();
inspectorEmitter.addListener("change", () => {
  console.log(inspectorCallsites);
});
function Inspector() {
  const forceUpdate = useForceUpdate();
  useEffect(() => {
    inspectorEmitter.addListener("change", forceUpdate);
    return () => {
      inspectorEmitter.removeListener("change", forceUpdate);
    };
  }, []);
  if (Object.keys(inspectorCallsites).length === 0) {
    return null;
  }
  return (
    <div
      className={css`
        position: fixed;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        top: 0;
        right: 0;
        width: 256px;
        padding: 12px 16px;
        background-color: #ffffff;

        button {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
        }
      `}
    >
      <div
        className={css`
          font-size: 10px;
          letter-spacing: 0.2px;
          margin-bottom: 8px;
          text-transform: uppercase;
        `}
      >
        Inspector
      </div>
      <div>
        {Object.keys(inspectorCallsites).map((location) => {
          const [filePath, position] = location.split(":");
          const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
          return (
            <div
              className={css`
                margin-bottom: 8px;
              `}
              key={location}
            >
              <div
                onMouseOver={() => {
                  inspectorCallsites[location][1] = true;
                  inspectorEmitter.emit("change");
                }}
                onMouseOut={() => {
                  inspectorCallsites[location][1] = false;
                  inspectorEmitter.emit("change");
                }}
                className={css`
                  font-size: 12px;
                  margin-bottom: 4px;
                `}
              >
                {fileName}{" "}
                <span
                  className={css`
                    color: #b0b0b0;
                  `}
                >
                  {position}
                </span>
              </div>
              <div>
                <textarea
                  value={inspectorCallsites[location][0]}
                  onChange={(e) => {
                    inspectorCallsites[location][0] = e.target.value;
                    inspectorEmitter.emit("change");
                  }}
                  className={css`
                    box-sizing: border-box;
                    font-family: "SF Mono";
                    font-size: 12px;
                    height: 48px;
                    padding: 4px;
                    width: 100%;
                  `}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <button
          onClick={() => {
            const updates = [];
            for (const location in inspectorCallsites) {
              const [fileName, position] = location.split(":");
              updates.push({
                fileName,
                position: parseInt(position),
                value: inspectorCallsites[location][0],
              });
            }
            fetch("http://localhost:3001/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ updates }),
            });
          }}
        >
          commit
        </button>
      </div>
    </div>
  );
}

let isMounted = false;
function mountInspector() {
  if (isMounted) {
    return;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  ReactDOM.render(<Inspector />, container);
  isMounted = true;
}

function useForceUpdate() {
  const [_, s] = useState(1);
  return useCallback(() => s((v) => v + 1), []);
}

export function useStyleDev([filename, position]: [
  filename: string,
  position: number
]) {
  /* eslint-disable react-hooks/rules-of-hooks */
  const forceUpdate = useForceUpdate();
  useEffect(() => {
    if (inspectorCallsites[`${filename}:${position}`] === undefined) {
      inspectorCallsites[`${filename}:${position}`] = ["", false];
    }
    inspectorEmitter.emit("change");
    inspectorEmitter.addListener("change", forceUpdate);
    mountInspector();
    return () => {
      delete inspectorCallsites[`${filename}:${position}`];
      inspectorEmitter.removeListener("change", forceUpdate);
      inspectorEmitter.emit("change");
    };
  }, []);
  /* eslint-enable react-hooks/rules-of-hooks */
  const value = inspectorCallsites[`${filename}:${position}`];
  if (value === undefined) {
    return;
  }
  return css(
    value[0],
    value[1] === true ? "box-shadow: 0 0 0 1px #ffffff80" : undefined
  );
}
