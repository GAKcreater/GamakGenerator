import React, { useState, useCallback } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import { invoke } from "@tauri-apps/api/core";

// --- Кастомный Узел с Портами ---
const ProcNode = ({ data }: any) => {
  return (
    <div style={{ 
      background: '#27272a', 
      color: '#fff', 
      border: '1px solid #4f46e5', 
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      width: '150px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#4f46e5' }} />
      <div style={{ fontWeight: 'bold', borderBottom: '1px solid #3f3f46', marginBottom: '5px', paddingBottom: '3px' }}>
        {data.label}
      </div>
      <div style={{ color: '#a1a1aa', fontSize: '10px' }}>{data.description}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#4f46e5' }} />
    </div>
  );
};

const nodeTypes = {
  procNode: ProcNode,
};

const containerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
  backgroundColor: '#18181b',
  color: 'white'
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: 'gen-1',
      type: 'procNode',
      data: { label: 'POINT SCATTER', description: 'Generates random points' },
      position: { x: 100, y: 100 },
    },
    {
      id: 'mod-1',
      type: 'procNode',
      data: { label: 'SAT PHYSICS', description: 'Separates overlapping objects' },
      position: { x: 400, y: 150 },
    }
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [pointsCount, setPointsCount] = useState(0);

  // Обработчик соединения нод
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds)),
    [setEdges]
  );

  const handleGenerate = async () => {
    try {
      const res = await invoke("generate_test_points", { count: 10 });
      setPointsCount((res as any[]).length);
    } catch (err) {
      console.error("Failed to call Rust:", err);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Top Bar */}
      <div style={{ 
        height: '60px', 
        borderBottom: '1px solid #3f3f46', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 20px', 
        justifyContent: 'space-between',
        backgroundColor: '#27272a',
        zIndex: 10
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          ProcEngine <span style={{ color: '#6366f1' }}>V2</span>
        </h1>
        <button 
          onClick={handleGenerate}
          style={{ 
            backgroundColor: '#4f46e5', 
            color: 'white', 
            border: 'none', 
            padding: '8px 20px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          RECALC GRAPH
        </button>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#27272a" gap={20} />
          <Controls />
        </ReactFlow>

        {/* System Monitor */}
        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          right: '20px', 
          backgroundColor: 'rgba(24, 24, 27, 0.9)', 
          padding: '15px', 
          borderRadius: '10px', 
          border: '1px solid #3f3f46',
          fontSize: '12px',
          fontFamily: 'monospace',
          pointerEvents: 'none'
        }}>
          <div style={{ color: '#a1a1aa', marginBottom: '5px' }}>SYSTEM MONITOR</div>
          <div>Status: <span style={{ color: '#4ade80' }}>READY</span></div>
          <div>Active Edges: <span style={{ color: '#818cf8' }}>{edges.length}</span></div>
          {edges.length > 0 && <div style={{ color: '#818cf8', marginTop: '5px' }}>DATA FLOW ACTIVE ⚡</div>}
        </div>
      </div>
    </div>
  );
}

export default App;
