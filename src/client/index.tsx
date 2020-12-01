import { css } from "@emotion/react";
import {} from "@emotion/react/types/css-prop";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import create from "zustand";
import Pane from "./Pane";

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

type CommitState = { type: "committing" } | { type: "error"; error: string };

function Inspector() {
  const { callsites, updateCallsite } = useStore();
  const [commitState, setCommitState] = useState<CommitState>();
  useEffect(() => {
    // clear commit state on fast refresh
    return () => setCommitState(undefined);
  }, []);
  if (Object.keys(callsites).length === 0) {
    return null;
  }
  return (
    <Pane>
      <div
        css={css`
          padding: 12px 12px;

          button {
            background-color: #808080;
            border: 0;
            border-radius: 2px;
            color: #ffffff;
            cursor: pointer;
            font-size: 10px;
            letter-spacing: 0.2px;
            padding: 6px 10px;
            text-transform: uppercase;
            :hover {
              background-color: #404040;
            }
          }
        `}
      >
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
              {callsite.codeLine !== undefined ? (
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
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    cursor: default;
                  `}
                >
                  {callsite.codeLine}
                </div>
              ) : null}
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
                    font-size: 12px;
                    height: 48px;
                    padding: 4px;
                    width: 100%;
                  `}
                />
              </div>
              <div
                css={css`
                  font-size: 10px;
                  text-align: right;
                  color: #808080;
                  cursor: default;
                `}
              >
                {fileName}{" "}
                <a
                  href={`vscode://file${filePath}${
                    callsite.lineNumber !== undefined
                      ? `:${callsite.lineNumber}`
                      : ""
                  }`}
                  css={css`
                    color: #b0b0b0;
                    text-decoration: none;
                    :hover {
                      text-decoration: underline;
                    }
                  `}
                >
                  {position}
                </a>
              </div>
            </div>
          );
        })}
        <div
          css={css`
            display: flex;
            align-items: center;
          `}
        >
          <button
            onClick={async () => {
              const updates = [];
              for (const location in callsites) {
                const [fileName, position] = location.split(":");
                updates.push({
                  fileName,
                  position: parseInt(position),
                  value: callsites[location].value,
                });
              }
              setCommitState({ type: "committing" });
              try {
                await fetch(
                  `http://localhost:${
                    process.env.REACT_APP_MANIPULATIVE_PORT ?? 3199
                  }/commit`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ updates }),
                  }
                );
              } catch (e) {
                setCommitState({ type: "error", error: e.toString() });
              }
            }}
          >
            {commitState?.type === "committing" ? "committing..." : "commit"}
          </button>
          {commitState?.type === "error" ? (
            <div
              css={css`
                color: #e45b32;
                font-size: 10px;
                margin-left: 8px;
              `}
            >
              {commitState.error}
            </div>
          ) : null}
        </div>
      </div>
    </Pane>
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
    callsite.hover
      ? cssFunction("box-shadow: inset 0 0 0 9999px rgba(120, 170, 210, 0.7)")
      : undefined
  );
}

export function useCssPlaceholder(location?: Location) {
  return usePlaceholder(location!, css);
}
