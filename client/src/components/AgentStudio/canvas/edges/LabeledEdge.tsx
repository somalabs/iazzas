import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  sourceHandleId,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isFalse = sourceHandleId === 'false' || sourceHandleId === 'rejected';

  const labelColor = isFalse
    ? 'bg-destructive/10 text-text-destructive border-border-destructive/30'
    : 'bg-surface-secondary text-text-secondary border-border-light';

  const strokeColor = isFalse ? 'var(--border-destructive)' : 'var(--border-medium)';

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: strokeColor, strokeWidth: 1.5 }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className={`pointer-events-none absolute rounded border px-1.5 py-0.5 text-[9px] font-medium ${labelColor}`}
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
