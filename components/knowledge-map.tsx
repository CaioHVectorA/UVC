"use client";
import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  useNodesState,
  useReactFlow,
  useNodesInitialized,
  useStore,
  type Node,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { neighbors, kindLabels, type StudioWorkspace } from "@/lib/workspace";
const colors: Record<string, string> = {
  character: "#91e3dc",
  concept: "#d8b6ff",
  place: "#edc993",
  artifact: "#e4a2cb",
  story: "#ff746a",
  event: "#94b6ff",
  visual: "#c8dd9f",
  document: "#f5f1e8",
  task: "#e7b87a",
  faction: "#d9d4a3",
};
function FitMapViewport({ focusId, all }: { focusId: string; all: boolean }) {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  useEffect(() => {
    if (ready && width && height)
      void fitView({ padding: 0.18, minZoom: all ? 0.2 : 0.7, maxZoom: 1.05 });
  }, [ready, width, height, focusId, all, fitView]);
  return null;
}
export default function KnowledgeMap({
  workspace,
  focusId,
  onSelect,
  onConnect,
  onSaveLayout,
  depth = 1,
  all = false,
}: {
  workspace: StudioWorkspace;
  focusId: string;
  onSelect: (id: string) => void;
  onConnect: (connection: Connection) => void;
  onSaveLayout: (positions: { id: string; x: number; y: number }[]) => void;
  depth?: number;
  all?: boolean;
}) {
  const visible = useMemo(
    () =>
      all
        ? workspace.entities.filter(
            (e) =>
              e.kind !== "visual" ||
              workspace.relations.some(
                (r) => r.sourceId === e.id || r.targetId === e.id,
              ),
          )
        : workspace.entities.filter((e) =>
            neighbors(focusId, workspace.relations, depth).has(e.id),
          ),
    [workspace, focusId, depth, all],
  );
  const initial = useMemo(
    () =>
      visible.map((entity, index) => ({
        id: entity.id,
        position:
          workspace.positions?.[entity.id] ??
          (entity.id === focusId && !all
            ? { x: 320, y: 200 }
            : all
              ? { x: (index % 5) * 250, y: Math.floor(index / 5) * 150 }
              : {
                  x:
                    320 +
                    Math.cos(
                      (visible
                        .filter((e) => e.id !== focusId)
                        .findIndex((e) => e.id === entity.id) *
                        Math.PI *
                        2) /
                        Math.max(visible.length - 1, 1),
                    ) *
                      330,
                  y:
                    200 +
                    Math.sin(
                      (visible
                        .filter((e) => e.id !== focusId)
                        .findIndex((e) => e.id === entity.id) *
                        Math.PI *
                        2) /
                        Math.max(visible.length - 1, 1),
                    ) *
                      230,
                }),
        data: {
          label: (
            <>
              <small>{kindLabels[entity.kind]}</small>
              <strong>{entity.title}</strong>
            </>
          ),
        },
        style: {
          background: "#18202a",
          color: "#f5f1e8",
          border: `${entity.id === focusId ? 2 : 1}px solid ${colors[entity.kind]}`,
          borderRadius: 8,
          width: 190,
        },
        ariaLabel: `Abrir ${entity.title}`,
      })),
    [visible, workspace.positions, focusId, all],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial);
  useEffect(() => {
    setNodes(initial);
  }, [initial, setNodes]);
  const ids = new Set(visible.map((e) => e.id));
  const edges = workspace.relations
    .filter((r) => ids.has(r.sourceId) && ids.has(r.targetId))
    .map((r) => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#91e3dc" },
      label: r.label,
      style: { stroke: "#91e3dc99" },
      labelStyle: { fill: "#f5f1e8", fontSize: 11 },
      labelBgStyle: { fill: "#10151c" },
    }));
  return (
    <div className="knowledge-map">
      <div className="map-instructions">
        <span>
          Arraste as fichas para organizar. Conecte os pontos para criar uma
          ligação.
        </span>
        <button
          className="button button-secondary"
          onClick={() =>
            onSaveLayout(nodes.map((n) => ({ id: n.id, ...n.position })))
          }
        >
          Salvar layout
        </button>
      </div>
      <div className="map-canvas">
        <ReactFlow
          key={`${focusId}:${depth}:${all}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={(_event, node) => onSelect(node.id)}
          onConnect={onConnect}
          fitView
          minZoom={0.15}
          maxZoom={1.8}
          colorMode="dark"
          deleteKeyCode={null}
          nodesConnectable
          aria-label="Mapa de relações"
        >
          <FitMapViewport focusId={focusId} all={all} />
          <Background color="#354454" gap={24} />
          <Controls
            showInteractive={false}
            fitViewOptions={{ minZoom: all ? 0.2 : 0.7, maxZoom: 1.05 }}
          />
          <MiniMap
            nodeColor={(node) =>
              (node.style?.borderColor as string) || "#91e3dc"
            }
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
}
