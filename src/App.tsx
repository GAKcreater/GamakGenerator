import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import { invoke } from "@tauri-apps/api/core";

// Components
import { Sidebar } from "./components/Sidebar";
import { Viewport } from "./components/Viewport";
import { Inspector } from "./components/Inspector";
import { ProcNode } from "./components/ProcNode";

// --- Custom Node Styles ---
const ViewportNode = ({ data }: any) => (
  <div className="bg-zinc-900 text-white border-2 border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.2)] overflow-hidden w-40 font-sans">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-zinc-900" />
    <div className="px-3 py-2 bg-purple-500/20 border-b border-purple-500/30">
      <div className="text-[10px] font-black uppercase tracking-tighter text-purple-300 mb-0.5">Output</div>
      <div className="text-xs font-bold truncate uppercase">{data.label}</div>
    </div>
    <div className="p-3 text-[10px] text-purple-200/50 italic leading-tight">Final Render Unit</div>
  </div>
);

const nodeTypes = {
  procNode: ProcNode,
  viewportNode: ViewportNode,
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [generatedPoints, setGeneratedPoints] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const addNode = useCallback((type: string, label: string, description: string) => {
    const id = `node-${Date.now()}`;
    const flowType = label === 'VIEWPORT' ? 'viewportNode' : 'procNode';
    const newNode = {
      id,
      type: flowType,
      data: { 
        label, 
        description, 
        count: 50, 
        radius: 200, 
        iterations: 20, 
        maskPath: null, 
        maskScale: 1.0,
        centerX: 0,
        centerY: 0,
        pointCenterX: 0,
        pointCenterY: 0
      },
      position: { x: 100, y: 100 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: newData } : node));
  }, [setNodes]);

  // --- ЛОГИКА ГРАФА ---
  const handleRecalc = async () => {
    try {
      const viewportNode = nodes.find(n => n.type === 'viewportNode');
      if (!viewportNode) return;

      const processNode = async (nodeId: string): Promise<{points: any[], mask: string | null, scale: number, mcx: number, mcy: number}> => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { points: [], mask: null, scale: 1.0, mcx: 0, mcy: 0 };

        if (node.data.label === 'IMAGE MASK') {
          return { 
            points: [], 
            mask: node.data.maskPath, 
            scale: node.data.maskScale || 1.0,
            mcx: node.data.centerX || 0,
            mcy: node.data.centerY || 0
          };
        }

        if (node.data.label === 'POINT SCATTER') {
          const incoming = edges.filter(e => e.target === nodeId);
          let activeMask: string | null = null;
          let activeScale: number = 1.0;
          let activeMCX: number = 0;
          let activeMCY: number = 0;
          
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            if (res.mask) {
              activeMask = res.mask;
              activeScale = res.scale;
              activeMCX = res.mcx;
              activeMCY = res.mcy;
            }
          }

          const pts = await invoke("generate_test_points", { 
            count: node.data.count || 50,
            maskPath: activeMask,
            radius: node.data.radius || 200.0,
            maskScale: activeScale,
            maskCenterX: activeMCX,
            maskCenterY: activeMCY,
            centerX: node.data.pointCenterX || 0,
            centerY: node.data.pointCenterY || 0
          });
          return { points: pts as any[], mask: null, scale: 1.0, mcx: 0, mcy: 0 };
        }

        if (node.data.label === 'SAT PHYSICS') {
          const incoming = edges.filter(e => e.target === nodeId);
          let allPts: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            allPts = [...allPts, ...res.points];
          }
          if (allPts.length > 0) {
            const result = await invoke("apply_physics", { points: allPts, iterations: node.data.iterations || 10 });
            return { points: result as any[], mask: null, scale: 1.0, mcx: 0, mcy: 0 };
          }
        }

        if (node.type === 'viewportNode') {
          const incoming = edges.filter(e => e.target === nodeId);
          let finalPts: any[] = [];
          for (const edge of incoming) {
            const res = await processNode(edge.source);
            finalPts = [...finalPts, ...res.points];
          }
          return { points: finalPts, mask: null, scale: 1.0, mcx: 0, mcy: 0 };
        }

        return { points: [], mask: null, scale: 1.0, mcx: 0, mcy: 0 };
      };

      const finalResult = await processNode(viewportNode.id);
      setGeneratedPoints(finalResult.points);

    } catch (err) {
      console.error("Graph Error:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <header className="h-14 flex items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shadow-md z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-black text-white shadow-lg">P</div>
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
            <div className="flex justify-between font-bold"><span className="text-zinc-400">PTS_OUT</span> <span className="text-indigo-400">{generatedPoints.length}</span></div>
          </div>
        </main>
        <Inspector selectedNode={selectedNode} onUpdateNodeData={updateNodeData} />
        <Viewport points={generatedPoints} selectedNode={selectedNode} />
      </div>
    </div>
  );
}

export default App;
