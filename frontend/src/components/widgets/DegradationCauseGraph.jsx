import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    type: 'default',
    data: { 
      label: 'Combustion Degradation\n(0.68)',
      xaiSummary: 'XAI Analysis: Irregular combustion patterns detected via vibration and EGT spread. This physical degradation leads directly to higher exhaust temperatures as unburnt fuel ignites late.'
    },
    position: { x: 50, y: 50 },
    style: { 
      background: 'var(--bg-card)', 
      color: 'var(--color-critical)',
      border: '1px solid var(--color-critical)',
      borderRadius: '50%',
      width: 120,
      height: 120,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: 'bold'
    },
  },
  {
    id: '2',
    data: { 
      label: 'Elevated EGT\n(0.54)',
      xaiSummary: 'XAI Analysis: Exhaust Gas Temperature is exceeding the expected digital twin baseline by a significant margin. This strongly correlates with upstream combustion inefficiencies.'
    },
    position: { x: 250, y: 50 },
    style: { 
      background: 'var(--bg-card)', 
      color: 'var(--color-warning)',
      border: '1px solid var(--color-warning)',
      borderRadius: '50%',
      width: 100,
      height: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: 'bold'
    },
  },
  {
    id: '3',
    data: { 
      label: 'Risk Increase\n(High)',
      xaiSummary: 'XAI Analysis: The compounded effect of combustion degradation and elevated temperatures increases the overall probability of mission failure or critical engine damage if unmitigated.'
    },
    position: { x: 450, y: 50 },
    style: { 
      background: 'var(--bg-card)', 
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
      borderRadius: '50%',
      width: 100,
      height: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: 'bold'
    },
  },
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: 'var(--text-secondary)' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'var(--text-secondary)',
    },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
    style: { stroke: 'var(--text-secondary)' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'var(--text-secondary)',
    },
  },
];

const DegradationCauseGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const onNodeMouseEnter = useCallback((event, node) => {
    setHoveredNode(node);
    setTooltipPos({ x: event.clientX, y: event.clientY });
  }, []);

  const onNodeMouseMove = useCallback((event) => {
    if (hoveredNode) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  }, [hoveredNode]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9998,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const modalStyle = {
    width: '90vw',
    height: '90vh',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    overflow: 'hidden'
  };

  const renderGraph = () => (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseMove={onNodeMouseMove}
      onNodeMouseLeave={onNodeMouseLeave}
      fitView
      attributionPosition="bottom-right"
    >
      <Background color="var(--border-color)" gap={16} size={1} />
    </ReactFlow>
  );

  return (
    <>
      {hoveredNode && createPortal(
        <div style={{
          position: 'fixed',
          top: tooltipPos.y + 15,
          left: tooltipPos.x + 15,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          padding: '12px',
          borderRadius: '6px',
          maxWidth: '280px',
          zIndex: 10000,
          pointerEvents: 'none'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-primary)' }}>{hoveredNode.data.label.replace('\n', ' ')}</h4>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {hoveredNode.data.xaiSummary}
          </p>
        </div>,
        document.body
      )}

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="text-sm font-semibold text-primary">DEGRADATION CAUSE GRAPH (Top Factors)</h3>
          <button 
            onClick={toggleExpand}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Expand
          </button>
        </div>
        
        <div style={{ flexGrow: 1, minHeight: '200px' }}>
          {!isExpanded && renderGraph()}
        </div>
        <div style={{ padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <p>ⓘ DISCLAIMER: This graph shows learned statistical relationships and is not a physical diagnosis.</p>
        </div>
      </div>

      {isExpanded && createPortal(
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-lg font-semibold text-primary">DEGRADATION CAUSE GRAPH (Expanded)</h3>
              <button 
                onClick={toggleExpand}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                Collapse
              </button>
            </div>
            <div style={{ flexGrow: 1 }}>
              {renderGraph()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DegradationCauseGraph;
