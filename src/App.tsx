import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow
} from "reactflow";
import "reactflow/dist/style.css";
import { invoke } from "@tauri-apps/api/core";

import { NODE_REGISTRY } from "./core/registry";
import { PortType } from "./core/types";
import { Sidebar } from "./components/Sidebar";
import { Viewport } from "./components/Viewport";
import { Inspector } from "./components/Inspector";
import { ProcNode } from "./components/ProcNode";

const ViewportNode = ({ id, data }: any) => {
  const definition = NODE_REGISTRY['VIEWPORT'];
  return (
    <div className="bg-zinc-900 text-white border-2 border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.2)] overflow-hidden w-48 font-sans relative">
      {definition?.inputs.map((input, idx) => (
        <Handle key={idx} type="target" position={Position.Left} id={input.name} className="nopan"
          style={{ background: '#a855f7', width: '14px', height: '14px', border: '3px solid #18181b', left: '-7px', cursor: 'crosshair' }} 
        />
      ))}
      <div className="px-3 py-2 bg-purple-500/20 border-b border-purple-500/30">
        <div className="text-[10px] font-black uppercase tracking-tighter text-purple-400 mb-0.5 uppercase">Output</div>
        <div className="text-xs font-bold truncate uppercase">{data.label}</div>
      </div>
      <div className="p-3 text-[10px] text-purple-200/50 italic leading-tight">Renders final result.</div>
    </div>
  );
};

const nodeTypes = { procNode: ProcNode, viewportNode: ViewportNode };

const FlowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [generatedEntities, setGeneratedEntities] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const [rightPanelWidth, setRightPanelWidth] = useState(800); 
  const [inspectorWidth, setInspectorWidth] = useState(300);   
  const [resizingPart, setResizingPart] = useState<'panel' | 'inspector' | null>(null);

  const resize = useCallback((e: MouseEvent) => {
    if (resizingPart === 'panel') {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.95) setRightPanelWidth(newWidth);
    } else if (resizingPart === 'inspector') {
      const rightPartStart = window.innerWidth - rightPanelWidth;
      const newInspectorWidth = e.clientX - rightPartStart;
      if (newInspectorWidth > 150 && newInspectorWidth < rightPanelWidth - 150) setInspectorWidth(newInspectorWidth);
    }
  }, [resizingPart, rightPanelWidth]);

  useEffect(() => {
    const stopResizing = () => setResizingPart(null);
    if (resizingPart) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resizingPart, resize]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const dataStr = event.dataTransfer.getData('application/reactflow');
    if (!dataStr || !reactFlowBounds) return;
    const { label, description } = JSON.parse(dataStr);
    const position = project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
    const definition = NODE_REGISTRY[label.replace(/ /g, '_')];
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}`,
      type: (label === 'VIEWPORT') ? 'viewportNode' : 'procNode',
      position,
      data: { label, description, ...(definition?.params || {}) },
    }));
  }, [project, setNodes]);

  const onConnect = useCallback((params: Connection) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    if (!sourceNode || !targetNode) return;
    const sourceDef = NODE_REGISTRY[sourceNode.data.label.replace(/ /g, '_')];
    const targetDef = NODE_REGISTRY[targetNode.data.label.replace(/ /g, '_')];
    const sourcePort = sourceDef?.outputs.find(o => o.name === params.sourceHandle);
    const targetPort = targetDef?.inputs.find(i => i.name === params.targetHandle);
    if (targetNode.type !== 'viewportNode' && sourcePort && targetPort && sourcePort.type !== targetPort.type) return;
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: sourcePort?.type === PortType.Points ? '#facc15' : (sourcePort?.type === PortType.Mask ? '#10b981' : '#3b82f6'), strokeWidth: 2 } }, eds));
  }, [nodes, setEdges]);

  const handleRecalc = async () => {
    try {
      const viewportNode = nodes.find(n => n.type === 'viewportNode');
      if (!viewportNode) return;

      const processNode = async (nodeId: string): Promise<{entities: any[], masks: any[]}> => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { entities: [], masks: [] };

        if (node.data.label === 'IMAGE MASK') {
          return { entities: [], masks: [{ type: 'Image', data: { path: node.data.maskPath, scale: node.data.maskScale || 1.0, centerX: node.data.centerX || 0, centerY: node.data.centerY || 0 } }] };
        }
        if (node.data.label === 'POINT SCATTER') {
          const incomingToMasks = edges.filter(e => e.target === nodeId && e.targetHandle === 'masks');
          let activeMasks: any[] = [];
          for (const edge of incomingToMasks) {
            const res = await processNode(edge.source);
            activeMasks = [...activeMasks, ...res.masks];
          }
          const pts = await invoke("generate_test_points", {
            count: node.data.count || 50, radius: node.data.radius || 200.0,
            centerX: node.data.centerX || 0, centerY: node.data.centerY || 0,
            seed: parseInt(node.data.seed || 42), masks: activeMasks,
            distribution: node.data.distribution || 'Uniform',
            gravity: node.data.gravity || 0.0,
            clumping: node.data.clumping || 0.0
          });
          return { entities: (pts as any[]).map(p => ({ type: 'Point', data: p, color: node.data.color })), masks: [] };
        }
        if (node.data.label === 'SAT PHYSICS') {
          const incoming = edges.filter(e => e.target === nodeId && e.targetHandle === 'in');
          let allPoints: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            allPoints = [...allPoints, ...res.entities.filter(e => e.type === 'Point').map(e => e.data)];
          }
          if (allPoints.length > 0) {
            const result = await invoke("apply_physics", { points: allPoints, iterations: node.data.iterations || 10 });
            return { entities: (result as any[]).map(p => ({ type: 'Point', data: p, color: node.data.color })), masks: [] };
          }
        }
        if (node.data.label === 'CONVEX HULL') {
          const incoming = edges.filter(e => e.target === nodeId && e.targetHandle === 'in');
          let allPoints: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            allPoints = [...allPoints, ...res.entities.filter(e => e.type === 'Point').map(e => e.data)];
          }
          if (allPoints.length > 0) {
            const result = await invoke("generate_convex_hull", { points: allPoints });
            return { entities: [{ type: 'Polygon', data: result, color: node.data.color }], masks: [] };
          }
        }
        if (node.data.label === 'POLYGON SUBTRACT') {
          const inBase = edges.filter(e => e.target === nodeId && e.targetHandle === 'base');
          const inSub = edges.filter(e => e.target === nodeId && e.targetHandle === 'subtract');
          let poly1: any = null;
          let poly2: any = null;

          if (inBase.length > 0) {
            const res = await processNode(inBase[0].source);
            const p = res.entities.find(e => e.type === 'Polygon');
            if (p) poly1 = p.data;
          }
          if (inSub.length > 0) {
            const res = await processNode(inSub[0].source);
            const p = res.entities.find(e => e.type === 'Polygon');
            if (p) poly2 = p.data;
          }

          if (poly1 && poly2) {
            const result = await invoke("polygon_boolean", {
              poly1,
              poly2,
              operation: 'subtract'
            });
            return { entities: (result as any[]).map(p => ({ type: 'Polygon', data: p, color: node.data.color })), masks: [] };
          } else if (poly1) {
            return { entities: [{ type: 'Polygon', data: poly1, color: node.data.color }], masks: [] };
          } else if (poly2) {
            return { entities: [{ type: 'Polygon', data: poly2, color: node.data.color }], masks: [] };
          }
        }
        if (node.type === 'viewportNode') {
          const incoming = edges.filter(e => e.target === nodeId && e.targetHandle === 'in');
          let finalEntities: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            finalEntities = [...finalEntities, ...res.entities];
          }
          return { entities: finalEntities, masks: [] };
        }
        return { entities: [], masks: [] };
      };
      const finalResult = await processNode(viewportNode.id);
      setGeneratedEntities(finalResult.entities);
    } catch (err) { console.error("Graph Error:", err); }
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  return (
    <div className={`flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans ${resizingPart ? 'cursor-col-resize select-none' : ''}`}>
      <header className="h-14 flex items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shadow-md z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-black text-white italic shadow-lg">P</div>
          <h1 className="text-sm font-black uppercase tracking-widest text-zinc-200">ProcEngine <span className="text-indigo-500">V2</span></h1>
        </div>
        <button onClick={handleRecalc} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 border border-indigo-400/30 uppercase">Execute Graph</button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onAddNode={(t, l, d) => setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: l === 'VIEWPORT' ? 'viewportNode' : 'procNode', position: { x: 100, y: 100 }, data: { label: l, description: d, ...(NODE_REGISTRY[l.replace(/ /g, '_')]?.params || {}) } }))} />
        <main ref={reactFlowWrapper} className="flex-1 relative border-r border-zinc-800 bg-zinc-900/30 min-w-0">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, n) => setSelectedNodeId(n.id)} onPaneClick={() => setSelectedNodeId(null)} onDrop={onDrop} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} nodeTypes={nodeTypes} deleteKeyCode={["Backend", "Delete"]} fitView>
            <Background color="#27272a" gap={24} size={1} />
            <Controls position="bottom-right" className="bg-zinc-800 border-zinc-700 fill-zinc-200" />
          </ReactFlow>
        </main>
        <div onMouseDown={e => { e.preventDefault(); setResizingPart('panel'); }} className={`w-1 group relative cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 ${resizingPart === 'panel' ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
        <div style={{ width: `${rightPanelWidth}px` }} className="flex flex-row shrink-0 bg-zinc-950 overflow-hidden relative">
          <div style={{ width: selectedNode ? `${inspectorWidth}px` : '0px' }} className={`flex shrink-0 border-r border-zinc-800 overflow-hidden bg-zinc-900 transition-all duration-200`}>
            {selectedNode && <Inspector selectedNode={selectedNode} onUpdateNodeData={(id, data) => setNodes(nds => nds.map(n => n.id === id ? { ...n, data } : n))} />}
          </div>
          {selectedNode && <div onMouseDown={e => { e.preventDefault(); setResizingPart('inspector'); }} className={`w-1 group relative cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 ${resizingPart === 'inspector' ? 'bg-indigo-500' : 'bg-zinc-800'}`} />}
          <div className="flex-1 min-w-0 flex flex-col h-full bg-zinc-950"><Viewport entities={generatedEntities} selectedNode={selectedNode} /></div>
        </div>
      </div>
    </div>
  );
}

export default function App() { return ( <ReactFlowProvider><FlowEditor /></ReactFlowProvider> ); }
