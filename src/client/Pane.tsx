import React, { useEffect, useRef } from "react";
import { css } from "@emotion/react";

function Pane({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<[x: number, y: number]>([0, 0]);
  const onUnmountRef = useRef<Function>();

  function onHeaderMouseDown(e: React.MouseEvent) {
    let lastPosition = [e.nativeEvent.screenX, e.nativeEvent.screenY];
    function onMouseMove(e: MouseEvent) {
      const [lastX, lastY] = lastPosition;
      const deltaX = e.screenX - lastX;
      const deltaY = e.screenY - lastY;
      offsetRef.current[0] += deltaX;
      offsetRef.current[1] += deltaY;
      rootRef.current!.style.transform = `translate3d(${offsetRef.current[0]}px, ${offsetRef.current[1]}px, 0)`;
      lastPosition = [e.screenX, e.screenY];
    }
    function cleanup() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    function onMouseUp() {
      cleanup();
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    onUnmountRef.current = cleanup;
  }

  useEffect(() => {
    return () => {
      if (onUnmountRef.current !== undefined) {
        onUnmountRef.current();
      }
    };
  }, []);

  return (
    <div
      css={css`
        font-size: 12px;
        position: fixed;
        top: 16px;
        right: 16px;
        width: 320px;
        background-color: #ffffff;
        border: 1px solid #b0b0b040;
        border-radius: 2px;
        color: #404040;
        overflow: hidden;

        &,
        button,
        textarea {
          font-family: "SF Mono", Consolas, Menlo, Monaco, "Courier New",
            Courier, monospace;
        }
      `}
      ref={rootRef}
    >
      <div
        css={css`
          background-color: #f0f0f0;
          color: #808080;
          padding: 8px 12px;
          font-size: 10px;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          user-select: none;
          cursor: move;
        `}
        onMouseDown={onHeaderMouseDown}
        ref={headerRef}
      >
        manipulative
      </div>
      <div>{children}</div>
    </div>
  );
}

export default Pane;
