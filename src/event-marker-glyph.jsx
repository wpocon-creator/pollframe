import React from "react";
// One marker drawing for the public polling chart and Studio/export renderers.
export function EventMarkerGlyph({
  event,
  labelY,
  height,
  bottom,
  hitTop,
  color,
  background,
  lineStyle,
}) {
  const first =
    labelY + height / 2 - ((event.labelLines.length - 1) * 15) / 2 + 5;
  const tint =
    color && background && /^#[a-f\d]{6}$/i.test(background)
      ? "#" +
        [1, 3, 5]
          .map((i) =>
            Math.round(
              parseInt(color.slice(i, i + 2), 16) * 0.06 +
                parseInt(background.slice(i, i + 2), 16) * 0.94,
            )
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")
      : background;
  return (
    <>
      {lineStyle==='band'&&<rect x={event.markerX-4} y={labelY+height/2} width="8" height={Math.max(0,bottom-labelY-height/2)} fill={color} opacity=".1"/>}
      <line
        className="event-hit-target"
        stroke="transparent"
        x1={event.markerX}
        x2={event.markerX}
        y1={hitTop}
        y2={bottom}
      />
      <line
        className="event-context-line"
        stroke={color}
        strokeWidth="1.15"
        strokeDasharray={lineStyle==='line'||lineStyle==='band'?undefined:'3 5'}
        opacity=".5"
        vectorEffect="non-scaling-stroke"
        x1={event.markerX}
        x2={event.markerX}
        y1={labelY + height / 2}
        y2={bottom}
      />
      <rect
        className="event-label-bg"
        x={event.labelCenter - event.labelWidth / 2}
        y={labelY}
        width={event.labelWidth}
        height={height}
        rx="10"
        strokeWidth="1.1"
        style={background ? { fill: tint, stroke: color } : undefined}
      />
      <text
        className="event-label-text"
        x={event.labelCenter}
        y={first}
        textAnchor="middle"
        fontSize="12.8"
        fontWeight="800"
        style={color ? { fill: color } : undefined}
      >
        {event.labelLines.map((line, index) => (
          <tspan x={event.labelCenter} dy={index === 0 ? 0 : 15} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </>
  );
}
