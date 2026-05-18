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

  const isTrue = sourceHandleId === 'true' || sourceHandleId === 'approved';
  const isFalse = sourceHandleId === 'false' || sourceHandleId === 'rejected';

  const labelColor = isTrue
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : isFalse
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : 'bg-surface-secondary text-text-secondary border-border-light';

  const strokeColor = isTrue ? '#34d399' : isFalse ? '#f87171' : 'var(--border-medium)';

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
