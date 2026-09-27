import React from "react";
// Native options become visible, keyboard-accessible choices without a menu layer.
export function StudioChoice({
  value,
  onChange,
  children,
  "aria-label": label,
}) {
  return (
    <div className="studio-choice" role="group" aria-label={label}>
      {React.Children.toArray(children)
        .flatMap((child) =>
          child?.type === React.Fragment
            ? React.Children.toArray(child.props.children)
            : [child],
        )
        .filter((child) => child?.props?.value !== undefined)
        .map((option) => (
          <button
            key={option.props.value}
            aria-label={React.Children.toArray(option.props.children)
              .filter((v) => typeof v === "string" || typeof v === "number")
              .join("")}
            type="button"
            disabled={option.props.disabled}
            aria-pressed={String(value) === String(option.props.value)}
            onClick={() =>
              onChange({ target: { value: String(option.props.value) } })
            }
          >
            {option.props.children}
          </button>
        ))}
    </div>
  );
}
