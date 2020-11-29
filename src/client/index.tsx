import { css } from "@emotion/react";
import {} from "@emotion/react/types/css-prop";
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import create from "zustand";

type CallsiteValue = {
  value: string;
  hover: boolean;
  lineNumber: number | undefined;
  codeLine: string | undefined;
};
const useStore = create<{
  callsites: Record<string, CallsiteValue>;
  updateCallsite: (location: string, value: CallsiteValue) => void;
  removeCallsite: (location: string) => void;
}>((set) => ({
  callsites: {},
  updateCallsite: (location, value) =>
    set((state) => ({
      ...state,
      callsites: { ...state.callsites, [location]: value },
    })),
  removeCallsite: (location) =>
    set((state) => {
      const newCallsites = { ...state.callsites };
      delete newCallsites[location];
      return {
        ...state,
        callsites: newCallsites,
      };
    }),
}));

function Inspector() {
  const { callsites, updateCallsite } = useStore();
  if (Object.keys(callsites).length === 0) {
    return null;
  }
  return (
    <div
      css={css`
        position: fixed;
        font-family: "SF Mono";
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
        css={css`
          font-size: 10px;
          letter-spacing: 0.2px;
          margin-bottom: 8px;
          text-transform: uppercase;
        `}
      >
        manipulative
      </div>
      <div>
        {Object.keys(callsites).map((location) => {
          const callsite = callsites[location];
          const [filePath, position] = location.split(":");
          const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
          return (
            <div
              css={css`
                margin-bottom: 8px;
              `}
              key={location}
            >
              <div
                onMouseOver={() => {
                  updateCallsite(location, { ...callsite, hover: true });
                }}
                onMouseOut={() => {
                  updateCallsite(location, { ...callsite, hover: false });
                }}
                css={css`
                  font-size: 12px;
                  margin-bottom: 4px;
                `}
              >
                <div>
                  {fileName}{" "}
                  <a
                    href={`vscode://file${filePath}${
                      callsite.lineNumber !== undefined
                        ? `:${callsite.lineNumber}`
                        : ""
                    }`}
                    css={css`
                      color: #b0b0b0;
                    `}
                  >
                    {position}
                  </a>
                </div>
                {callsite.codeLine !== undefined ? (
                  <div>{callsite.codeLine}</div>
                ) : null}
              </div>
              <div>
                <textarea
                  value={callsite.value}
                  onChange={(e) => {
                    updateCallsite(location, {
                      ...callsite,
                      value: e.target.value,
                    });
                  }}
                  css={css`
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
            for (const location in callsites) {
              const [fileName, position] = location.split(":");
              updates.push({
                fileName,
                position: parseInt(position),
                value: callsites[location].value,
              });
            }
            fetch(
              `http://localhost:${
                process.env.REACT_APP_MANIPULATIVE_PORT ?? 3001
              }/commit`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ updates }),
              }
            );
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

type Location = [
  filename: string,
  position: number,
  lineNumber?: number,
  codeLine?: string
];

function usePlaceholder(location: Location, cssFunction: Function) {
  const [filename, position, lineNumber, codeLine] = location;
  const locationKey = `${filename}:${position}`;
  const callsite = useStore((state) => state.callsites[locationKey]);
  const updateCallsite = useStore((state) => state.updateCallsite);
  const removeCallsite = useStore((state) => state.removeCallsite);
  useEffect(() => {
    updateCallsite(locationKey, {
      value: "",
      hover: false,
      lineNumber,
      codeLine,
    });
    mountInspector();
    return () => {
      removeCallsite(locationKey);
    };
  }, []);
  if (callsite === undefined) {
    return;
  }
  return cssFunction(
    callsite.value,
    callsite.hover ? "box-shadow: 0 0 0 1px #ffffff80" : undefined
  );
}

export function useCssPlaceholder(location?: Location) {
  return usePlaceholder(location!, css);
}
