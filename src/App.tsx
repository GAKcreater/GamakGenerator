import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import { invoke } from "@tauri-apps/api/core";

// Core & Types
import { NODE_REGISTRY } from "./core/registry";
import { PortType } from "./core/types";

// Components
import { Sidebar } from "./components/Sidebar";
import { Viewport } from "./components/Viewport";
import { Inspector } from "./components/Inspector";
import { ProcNode } from "./components/ProcNode";

// --- Кастомный Узел: Viewport (Финал) ---
const ViewportNode = ({ id, data }: any) => {
  const definition = NODE_REGISTRY['VIEWPORT'];
  return (
    <div className="bg-zinc-900 text-white border-2 border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.2)] overflow-hidden w-48 font-sans relative">
      {definition?.inputs.map((input, idx) => (
        <Handle 
          key={idx}
          type="target" 
          position={Position.Left} 
          id={input.name}
          className="nopan"
          style={{ 
            background: '#a855f7', 
            width: '14px', 
            height: '14px', 
            border: '3px solid #18181b', 
            left: '-7px',
            cursor: 'crosshair'
          }} 
        />
      ))}
      <div className="px-3 py-2 bg-purple-500/20 border-b border-purple-500/30">
        <div className="text-[10px] font-black uppercase tracking-tighter text-purple-300 mb-0.5">Output</div>
        <div className="text-xs font-bold truncate uppercase">{data.label}</div>
      </div>
      <div className="p-3 text-[10px] text-purple-200/50 italic leading-tight">Renders final result.</div>
    </div>
  );
};

// Импортируем Position для ViewportNode
import { Position } from "reactflow";

const nodeTypes = {
  procNode: ProcNode,
  viewportNode: ViewportNode,
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [generatedEntities, setGeneratedEntities] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const addNode = useCallback((type: string, label: string, description: string) => {
    const id = `node-${Date.now()}`;
    const regKey = label.replace(' ', '_');
    const definition = NODE_REGISTRY[regKey];
    
    const newNode = {
      id,
      type: label === 'VIEWPORT' ? 'viewportNode' : 'procNode',
      data: { 
        label, 
        description, 
        ...(definition?.params || {})
      },
      position: { x: 100, y: 100 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Валидация типов портов
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) return;

      const sourceDef = NODE_REGISTRY[sourceNode.data.label.replace(' ', '_')];
      const targetDef = NODE_REGISTRY[targetNode.data.label.replace(' ', '_')];

      const sourcePort = sourceDef?.outputs.find(o => o.name === params.sourceHandle);
      const targetPort = targetDef?.inputs.find(i => i.name === params.targetHandle);

      // Специальное правило для VIEWPORT - принимает все (кроме Mask в будущем)
      const isViewportTarget = targetNode.type === 'viewportNode';

      if (!isViewportTarget && sourcePort && targetPort && sourcePort.type !== targetPort.type) {
        console.warn(`Type Mismatch: Cannot connect ${sourcePort.type} to ${targetPort.type}`);
        return;
      }

      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: sourcePort ? (sourcePort.type === PortType.Points ? '#facc15' : '#3b82f6') : '#6366f1', strokeWidth: 2 } }, eds));
    },
    [nodes, setEdges]
  );

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: newData } : node));
  }, [setNodes]);

  // --- ЛОГИКА ГРАФА (ОБНОВЛЕННАЯ ПОД ПОРТЫ И СУЩНОСТИ) ---
  const handleRecalc = async () => {
    try {
      const viewportNode = nodes.find(n => n.type === 'viewportNode');
      if (!viewportNode) return;

      const processNode = async (nodeId: string): Promise<{entities: any[], mask?: any}> => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { entities: [] };

        if (node.data.label === 'IMAGE MASK') {
          return { 
            entities: [], 
            mask: { path: node.data.maskPath, scale: node.data.maskScale || 1.0, cx: node.data.centerX || 0, cy: node.data.centerY || 0 } 
          };
        }

        if (node.data.label === 'POINT SCATTER') {
          const incomingToMask = edges.filter(e => e.target === nodeId && e.targetHandle === 'mask');
          let activeMask = null;
          
          for (const edge of incomingToMask) {
            const res = await processNode(edge.source);
            if (res.mask) { activeMask = res.mask; }
          }

          const pts = await invoke("generate_test_points", { 
            count: node.data.count || 50, 
            maskPath: activeMask?.path, 
            radius: node.data.radius || 200.0, 
            maskScale: activeMask?.scale || 1.0, 
            maskCenterX: activeMask?.cx || 0, 
            maskCenterY: activeMask?.cy || 0,
            centerX: node.data.centerX || 0, 
            centerY: node.data.centerY || 0
          });
          
          // Оборачиваем в ProcEntity (Point)
          return { entities: (pts as any[]).map(p => ({ type: 'Point', data: p })) };
        }

        if (node.data.label === 'SAT PHYSICS') {
          const incoming = edges.filter(e => e.target === nodeId && e.targetHandle === 'in');
          let allPoints: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            // Извлекаем только точки из сущностей
            const pts = res.entities.filter(e => e.type === 'Point').map(e => e.data);
            allPoints = [...allPoints, ...pts];
          }
          if (allPoints.length > 0) {
            const result = await invoke("apply_physics", { points: allPoints, iterations: node.data.iterations || 10 });
            return { entities: (result as any[]).map(p => ({ type: 'Point', data: p })) };
          }
        }

        if (node.data.label === 'CONVEX HULL') {
            const incoming = edges.filter(e => e.target === nodeId && e.targetHandle === 'in');
            let allPoints: any[] = [];
            for (const edge of incoming) {
              const res = await processNode(edge.source);
              const pts = res.entities.filter(e => e.type === 'Point').map(e => e.data);
              allPoints = [...allPoints, ...pts];
            }
            if (allPoints.length > 0) {
              const result = await invoke("generate_convex_hull", { points: allPoints });
              return { entities: [{ type: 'Polygon', data: result }] };
            }
        }

        if (node.type === 'viewportNode') {
          const incoming = edges.filter(e => e.target === nodeId && e.targetHandle === 'in');
          let finalEntities: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            finalEntities = [...finalEntities, ...res.entities];
          }
          return { entities: finalEntities };
        }

        return { entities: [] };
      };

      const finalResult = await processNode(viewportNode.id);
      setGeneratedEntities(finalResult.entities);
    } catch (err) { console.error("Graph Error:", err); }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans italic-none">
      <header className="h-14 flex items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shadow-md z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-black text-white italic shadow-lg">P</div>
          <h1 className="text-sm font-black uppercase tracking-widest text-zinc-200">ProcEngine <span className="text-indigo-500">V2</span></h1>
        </div>
        <button onClick={handleRecalc} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 border border-indigo-400/30">
          Execute Graph
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onAddNode={addNode} />
        <main className="flex-[2] relative border-r border-zinc-800 bg-zinc-900/30">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedNodeId(n.id)} onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes} deleteKeyCode={["Backend", "Delete"]} fitView
          >
            <Background color="#27272a" gap={24} size={1} />
            <Controls position="bottom-right" className="bg-zinc-800 border-zinc-700 fill-zinc-200" />
          </ReactFlow>
          <div className="absolute top-6 right-6 p-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl pointer-events-none min-w-[150px] z-20 font-sans text-[10px] space-y-1 font-mono">
            <div className="flex justify-between"><span>NODES</span> <span className="text-zinc-200 font-bold">{nodes.length}</span></div>
            <div className="flex justify-between border-b border-zinc-800/50 pb-1 mb-1"><span>EDGES</span> <span className="text-indigo-400 font-bold">{edges.length}</span></div>
            <div className="flex justify-between font-bold"><span className="text-zinc-400">ENTITIES</span> <span className="text-indigo-400">{generatedEntities.length}</span></div>
          </div>
        </main>
        <Inspector selectedNode={selectedNode} onUpdateNodeData={updateNodeData} />
        <Viewport entities={generatedEntities} selectedNode={selectedNode} />
      </div>
    </div>
  );
}


export default App;
