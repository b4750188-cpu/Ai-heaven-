import {
  ExternalLink,
  Eye,
  Filter,
  Info,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GraphEdge, GraphNode, KnowledgeGraphData } from '../../types/graph';
import { RelationshipType, ResourceType } from '../../types/resource';

interface KnowledgeGraphViewProps {
  data: KnowledgeGraphData;
  onSelectResource: (slug: string) => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  data,
  onSelectResource
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transforms: pan & zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selections
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('google-ai-studio');
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  // Filters
  const [nodeSearch, setNodeSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all');
  const [filterRelType, setFilterRelType] = useState<RelationshipType | 'all'>('all');

  // Compute node coordinates deterministically around key hubs
  const positionedNodes = useMemo(() => {
    const nodes = [...data.nodes];
    const width = 900;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Anchor Google AI Studio in center
    const coords: Record<string, { x: number; y: number }> = {
      'google-ai-studio': { x: centerX, y: centerY },
      'gemini-api': { x: centerX + 180, y: centerY - 90 },
      'google-genai-sdk': { x: centerX + 290, y: centerY - 150 },
      'gemini-1-5-pro': { x: centerX - 180, y: centerY - 90 },
      'claude-3-5-sonnet': { x: centerX - 320, y: centerY - 160 },
      'gpt-4o': { x: centerX - 260, y: centerY + 60 },
      'llama-3-3-70b': { x: centerX - 140, y: centerY + 180 },
      'huggingface-hub': { x: centerX - 30, y: centerY + 240 },
      'google-gemini-cookbook': { x: centerX + 190, y: centerY + 130 },
      'model-context-protocol': { x: centerX + 140, y: centerY + 240 },
      'demo-sandbox-agent': { x: centerX + 320, y: centerY + 80 }
    };

    return nodes.map((node, index) => {
      if (coords[node.id]) {
        return { ...node, x: coords[node.id].x, y: coords[node.id].y };
      }
      // Fallback circular layout for any dynamically added nodes
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = 220 + (index % 3) * 60;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });
  }, [data.nodes]);

  // Node position lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, typeof positionedNodes[0]>();
    positionedNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [positionedNodes]);

  // Filtered edges
  const visibleEdges = useMemo(() => {
    return data.edges.filter(edge => {
      if (filterRelType !== 'all' && edge.relationship_type !== filterRelType) return false;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return false;
      if (filterType !== 'all') {
        if (sourceNode.resource_type !== filterType && targetNode.resource_type !== filterType) {
          return false;
        }
      }
      return true;
    });
  }, [data.edges, filterRelType, filterType, nodeMap]);

  // Connected nodes for the currently selected node
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    data.edges.forEach(e => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, data.edges]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.min(2.5, Math.max(0.4, Number((z + delta).toFixed(2)))));
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(2.5, z + 0.2));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.2));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const selectedNode = positionedNodes.find(n => n.id === selectedNodeId);

  return (
    <div className="space-y-4">
      {/* Graph Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
            <span>AI HEAVEN GRAPH</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>VERIFIED RELATIONSHIPS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            AI Ecosystem Knowledge Graph
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Interconnected foundation models, platforms, APIs, SDKs, and open protocols. Click any node or link to inspect evidence.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Node search filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={nodeSearch}
              onChange={(e) => setNodeSearch(e.target.value)}
              placeholder="Find node in graph..."
              className="rounded border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Relationship Filter */}
          <select
            value={filterRelType}
            onChange={(e) => setFilterRelType(e.target.value as any)}
            aria-label="Filter relationship type"
            className="rounded border border-neutral-800 bg-neutral-900 py-1.5 px-2 text-xs text-neutral-200 focus:outline-none"
          >
            <option value="all">All Relationships</option>
            <option value="provides">provides</option>
            <option value="accesses">accesses</option>
            <option value="integrates_with">integrates_with</option>
            <option value="compatible_with">compatible_with</option>
            <option value="alternative_to">alternative_to</option>
            <option value="publishes">publishes</option>
          </select>
        </div>
      </div>

      {/* Main Canvas & Inspector Container */}
      <div className="relative h-[550px] sm:h-[650px] w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden select-none">
        {/* Floating Zoom & Canvas Controls */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/90 p-1 backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            title="Zoom In"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            title="Zoom Out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-4 rounded-md border border-neutral-800/80 bg-neutral-900/80 px-3 py-1.5 text-[11px] font-mono text-neutral-400 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Platform / Tool</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
            <span>AI Model</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span>API / SDK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span>Standard / Protocol</span>
          </div>
        </div>

        {/* Interactive SVG Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className={`h-full w-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <svg className="h-full w-full">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render Edges */}
              {visibleEdges.map((edge) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);
                if (!source || !target) return null;

                const isConnectedToSelected =
                  selectedNodeId &&
                  (edge.source === selectedNodeId || edge.target === selectedNodeId);

                const isDirectlySelected = selectedEdge?.id === edge.id;

                const strokeColor = isDirectlySelected
                  ? '#34d399'
                  : isConnectedToSelected
                  ? '#10b981'
                  : edge.relationship_type === 'alternative_to'
                  ? '#6366f1'
                  : '#262626';

                const strokeDash = edge.relationship_type === 'alternative_to' ? '4 3' : 'none';
                const strokeWidth = isConnectedToSelected || isDirectlySelected ? 2 : 1;

                // Midpoint for label
                const midX = (source.x! + target.x!) / 2;
                const midY = (source.y! + target.y!) / 2;

                return (
                  <g
                    key={edge.id}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(edge);
                    }}
                  >
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      className="transition-colors"
                    />
                    {/* Edge Label Pill */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-38"
                        y="-8"
                        width="76"
                        height="16"
                        rx="3"
                        fill="#0a0a0a"
                        stroke={strokeColor}
                        strokeWidth="0.8"
                      />
                      <text
                        textAnchor="middle"
                        y="3"
                        className="text-[9px] font-mono fill-neutral-400 group-hover:fill-emerald-400 transition-colors pointer-events-none select-none"
                      >
                        {edge.relationship_type.replace('_', ' ')}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {positionedNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isConnected = connectedNodeIds.has(node.id);
                const isMatchSearch =
                  nodeSearch.trim().length > 0 &&
                  (node.name.toLowerCase().includes(nodeSearch.toLowerCase()) ||
                    node.slug.toLowerCase().includes(nodeSearch.toLowerCase()));

                let fillColor = '#171717';
                let strokeColor = '#404040';

                if (node.resource_type === 'platform') {
                  fillColor = isSelected ? '#047857' : '#064e3b';
                  strokeColor = '#10b981';
                } else if (node.resource_type === 'model') {
                  fillColor = isSelected ? '#0e7490' : '#155e75';
                  strokeColor = '#06b6d4';
                } else if (node.resource_type === 'api' || node.resource_type === 'sdk') {
                  fillColor = isSelected ? '#4338ca' : '#312e81';
                  strokeColor = '#6366f1';
                } else if (node.resource_type === 'mcp_server') {
                  fillColor = isSelected ? '#6b21a8' : '#581c87';
                  strokeColor = '#a855f7';
                }

                if (node.is_demo_data) {
                  strokeColor = '#f59e0b';
                }

                const opacity =
                  selectedNodeId && !isConnected && !isMatchSearch ? 0.35 : 1;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    opacity={opacity}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedEdge(null);
                    }}
                  >
                    {/* Outer focus glow when selected or searched */}
                    {(isSelected || isMatchSearch) && (
                      <circle
                        r="28"
                        fill="none"
                        stroke={isMatchSearch ? '#f59e0b' : '#34d399'}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="animate-spin-slow"
                      />
                    )}

                    <circle
                      r={node.id === 'google-ai-studio' ? '22' : '18'}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      className="transition-all duration-200"
                    />

                    {/* Node label */}
                    <text
                      textAnchor="middle"
                      y={node.id === 'google-ai-studio' ? '34' : '30'}
                      className={`text-[11px] font-mono pointer-events-none select-none transition-colors ${
                        isSelected ? 'fill-emerald-400 font-semibold' : 'fill-neutral-200'
                      }`}
                    >
                      {node.name.length > 20 ? `${node.name.slice(0, 18)}...` : node.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Selected Node Drawer / Inspector (Right Side) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-neutral-800 bg-neutral-900/95 p-4 text-xs backdrop-blur-md shadow-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">
                  {selectedNode.resource_type.replace('_', ' ')}
                </span>
                <h2 className="text-sm font-semibold text-neutral-100">{selectedNode.name}</h2>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                aria-label="Close details"
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="font-mono text-[11px] space-y-1 text-neutral-400 pt-1 border-t border-neutral-800">
              <div className="flex justify-between">
                <span>Trust Score:</span>
                <span className="text-neutral-200">{selectedNode.trust_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Verification:</span>
                <span className="text-emerald-400 capitalize">{selectedNode.verification_status}</span>
              </div>
              {selectedNode.is_demo_data && (
                <div className="text-amber-400 font-medium">⚠️ Staging Demo Record</div>
              )}
            </div>

            {/* Connected nodes count */}
            <div className="text-[11px] text-neutral-400 font-mono">
              <span>Connected to {connectedNodeIds.size - 1} other ecosystem resources</span>
            </div>

            <button
              onClick={() => onSelectResource(selectedNode.slug)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-emerald-500 text-neutral-950 font-medium hover:bg-emerald-400 transition-colors"
            >
              <span>Open Full Resource Page</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Selected Edge Inspector Modal */}
        {selectedEdge && (
          <div className="absolute bottom-4 right-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-neutral-800 bg-neutral-900/95 p-4 text-xs backdrop-blur-md shadow-xl space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">
                  VERIFIED RELATIONSHIP
                </span>
                <div className="font-semibold text-neutral-100 font-mono text-xs">
                  {selectedEdge.source} → {selectedEdge.relationship_type} → {selectedEdge.target}
                </div>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                aria-label="Close details"
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {selectedEdge.description}
            </p>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-500">Confidence: {(selectedEdge.confidence * 100).toFixed(0)}%</span>
              {selectedEdge.evidence_url && (
                <a
                  href={selectedEdge.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <span>Evidence Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
