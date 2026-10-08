import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  FileJson,
  Filter,
  Flame,
  Globe,
  HardDrive,
  Info,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  Network,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  X,
  Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraphEdge, GraphNode, KnowledgeGraphData } from '../../types/graph';
import { RelationshipType, ResourceType } from '../../types/resource';

interface KnowledgeGraphViewProps {
  data: KnowledgeGraphData;
  onSelectResource: (slug: string) => void;
  onOpenAgentSpec?: (slug: string) => void;
}

// Visual styling configuration for distinct node types
const NODE_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    glow: string;
    borderColor: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    radius: number;
    shape: 'circle' | 'hexagon' | 'octagon' | 'diamond' | 'shield' | 'droid';
  }
> = {
  provider: {
    label: 'Provider Hub',
    color: '#38bdf8', // sky-400
    glow: 'rgba(56, 189, 248, 0.35)',
    borderColor: '#0284c7',
    bgColor: '#082f49',
    icon: Building2,
    radius: 34,
    shape: 'hexagon'
  },
  model: {
    label: 'Foundation Model',
    color: '#a855f7', // purple-500
    glow: 'rgba(168, 85, 247, 0.4)',
    borderColor: '#9333ea',
    bgColor: '#3b0764',
    icon: Cpu,
    radius: 30,
    shape: 'circle'
  },
  platform: {
    label: 'Platform & IDE',
    color: '#10b981', // emerald-500
    glow: 'rgba(16, 185, 129, 0.4)',
    borderColor: '#059669',
    bgColor: '#064e3b',
    icon: Layers,
    radius: 32,
    shape: 'octagon'
  },
  api: {
    label: 'API Gateway',
    color: '#06b6d4', // cyan-500
    glow: 'rgba(6, 182, 212, 0.35)',
    borderColor: '#0891b2',
    bgColor: '#164e63',
    icon: Globe,
    radius: 28,
    shape: 'diamond'
  },
  sdk: {
    label: 'Developer SDK',
    color: '#3b82f6', // blue-500
    glow: 'rgba(59, 130, 246, 0.35)',
    borderColor: '#2563eb',
    bgColor: '#1e3a8a',
    icon: Code2,
    radius: 26,
    shape: 'circle'
  },
  mcp_server: {
    label: 'MCP Protocol Server',
    color: '#f59e0b', // amber-500
    glow: 'rgba(245, 158, 11, 0.35)',
    borderColor: '#d97706',
    bgColor: '#451a03',
    icon: Server,
    radius: 28,
    shape: 'hexagon'
  },
  tool: {
    label: 'Execution Tool',
    color: '#f97316', // orange-500
    glow: 'rgba(249, 115, 22, 0.35)',
    borderColor: '#ea580c',
    bgColor: '#431407',
    icon: Terminal,
    radius: 26,
    shape: 'shield'
  },
  droid: {
    label: 'Autonomous Droid',
    color: '#22c55e', // green-500
    glow: 'rgba(34, 197, 94, 0.45)',
    borderColor: '#16a34a',
    bgColor: '#052e16',
    icon: Bot,
    radius: 32,
    shape: 'droid'
  },
  agent: {
    label: 'Autonomous Agent',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.45)',
    borderColor: '#16a34a',
    bgColor: '#052e16',
    icon: Bot,
    radius: 30,
    shape: 'droid'
  },
  agent_framework: {
    label: 'Agent Framework',
    color: '#14b8a6', // teal-500
    glow: 'rgba(20, 184, 166, 0.35)',
    borderColor: '#0d9488',
    bgColor: '#134e4a',
    icon: Workflow,
    radius: 26,
    shape: 'circle'
  },
  repository: {
    label: 'Repository & Cookbooks',
    color: '#64748b', // slate-500
    glow: 'rgba(100, 116, 139, 0.35)',
    borderColor: '#475569',
    bgColor: '#1e293b',
    icon: FileCode,
    radius: 26,
    shape: 'circle'
  }
};

const DEFAULT_TYPE_CONFIG = {
  label: 'Resource',
  color: '#94a3b8',
  glow: 'rgba(148, 163, 184, 0.3)',
  borderColor: '#64748b',
  bgColor: '#0f172a',
  icon: Database as React.ComponentType<{ className?: string; style?: React.CSSProperties }>,
  radius: 26,
  shape: 'circle' as const
};

// Edge colors by relationship type
const RELATIONSHIP_CONFIG: Record<string, { color: string; label: string; dash?: string }> = {
  provides: { color: '#38bdf8', label: 'provides' },
  accesses: { color: '#22c55e', label: 'accesses' },
  uses: { color: '#a855f7', label: 'uses' },
  uses_tool: { color: '#f97316', label: 'uses tool', dash: '3 2' },
  integrates_with: { color: '#06b6d4', label: 'integrates with' },
  compatible_with: { color: '#6366f1', label: 'compatible with', dash: '4 3' },
  alternative_to: { color: '#f43f5e', label: 'alternative to', dash: '4 4' },
  publishes: { color: '#eab308', label: 'publishes' },
  depends_on: { color: '#ec4899', label: 'depends on' },
  documents: { color: '#94a3b8', label: 'documents', dash: '2 2' },
  built_with: { color: '#10b981', label: 'built with' }
};

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  data,
  onSelectResource,
  onOpenAgentSpec
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport transforms: pan & zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Multi-touch pinch tracking
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  // Selections
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('google-ai-studio');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Modes & Toggles
  const [isIsolateMode, setIsIsolateMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set());
  const [activeInspectorTab, setActiveInspectorTab] = useState<'metadata' | 'contract' | 'connections' | 'provenance'>('metadata');

  // Filters
  const [nodeSearch, setNodeSearch] = useState<string>('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedRelType, setSelectedRelType] = useState<string>('all');
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [excludeDemoData, setExcludeDemoData] = useState<boolean>(false);

  // Simulation physics positions state (seeded from deterministic clustered layout)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Initialize deterministic positions with aesthetic radial cluster layout
  useEffect(() => {
    if (!data.nodes || data.nodes.length === 0) return;

    const width = 1200;
    const height = 800;
    const centerX = width / 2;
    const centerY = height / 2;

    // Cluster Centers
    const clusterCenters: Record<string, { x: number; y: number }> = {
      google: { x: centerX - 60, y: centerY - 80 },
      anthropic: { x: centerX - 360, y: centerY - 140 },
      openai: { x: centerX - 340, y: centerY + 160 },
      meta: { x: centerX - 120, y: centerY + 280 },
      github: { x: centerX + 260, y: centerY + 200 },
      huggingface: { x: centerX + 100, y: centerY + 300 },
      droids: { x: centerX + 340, y: centerY - 120 },
      platform_tools: { x: centerX + 400, y: centerY + 80 },
      ecosystem: { x: centerX + 180, y: centerY - 40 }
    };

    const initialPos: Record<string, { x: number; y: number }> = {};

    // 1. Anchor prominent specific nodes
    const prominentAnchors: Record<string, { x: number; y: number }> = {
      'google-ai-studio': { x: centerX - 30, y: centerY - 50 },
      'gemini-api': { x: centerX + 120, y: centerY - 120 },
      'gemini-1-5-pro': { x: centerX - 180, y: centerY - 160 },
      'google-genai-sdk': { x: centerX + 180, y: centerY - 240 },
      'google': { x: centerX - 150, y: centerY - 60 },
      'anthropic': { x: centerX - 420, y: centerY - 160 },
      'claude-3-5-sonnet': { x: centerX - 360, y: centerY - 60 },
      'model-context-protocol': { x: centerX - 260, y: centerY + 40 },
      'openai': { x: centerX - 420, y: centerY + 160 },
      'gpt-4o': { x: centerX - 300, y: centerY + 180 },
      'meta': { x: centerX - 180, y: centerY + 320 },
      'llama-3-3-70b': { x: centerX - 40, y: centerY + 240 },
      'huggingface': { x: centerX + 60, y: centerY + 340 },
      'huggingface-hub': { x: centerX + 120, y: centerY + 220 },
      'github': { x: centerX + 260, y: centerY + 180 },
      'google-gemini-cookbook': { x: centerX + 180, y: centerY + 90 },
      'agent_droid_prime': { x: centerX + 340, y: centerY - 140 },
      'tool_terminal_sandbox': { x: centerX + 440, y: centerY - 40 },
      'tool_fs_scoped': { x: centerX + 460, y: centerY - 150 },
      'tool_mcp_client': { x: centerX + 360, y: centerY + 40 }
    };

    // 2. Assign initial positions with gentle cluster offsets
    data.nodes.forEach((node, idx) => {
      if (prominentAnchors[node.id]) {
        initialPos[node.id] = { ...prominentAnchors[node.id] };
        return;
      }
      const clusterKey = node.cluster || (node.provider_id ? node.provider_id.replace('prov_', '') : 'ecosystem');
      const center = clusterCenters[clusterKey] || { x: centerX, y: centerY };
      const angle = (idx * 0.9) % (2 * Math.PI);
      const radius = 90 + ((idx * 27) % 70);
      initialPos[node.id] = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };
    });

    setNodePositions(initialPos);

    // Initial center pan
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: (rect.width - width) / 2,
        y: (rect.height - height) / 2
      });
    }
  }, [data.nodes]);

  // Fullscreen escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Compute Neighborhood & Visibility
  const { visibleNodes, visibleEdges, connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    const rawNodes = data.nodes || [];
    const rawEdges = data.edges || [];

    // Filter by search, types, and demo flags
    let filteredNodes = rawNodes.filter(node => {
      if (excludeDemoData && node.is_demo_data) return false;
      if (onlyVerified && node.verification_status !== 'verified') return false;
      if (selectedResourceType !== 'all' && node.resource_type !== selectedResourceType) return false;
      if (nodeSearch.trim()) {
        const q = nodeSearch.toLowerCase();
        const matchName = node.name.toLowerCase().includes(q);
        const matchSlug = node.slug.toLowerCase().includes(q);
        const matchSummary = node.summary?.toLowerCase().includes(q);
        const matchTags = node.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchName && !matchSlug && !matchSummary && !matchTags) return false;
      }
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // Calculate neighborhood for selected node
    const connNodes = new Set<string>();
    const connEdges = new Set<string>();

    if (selectedNodeId) {
      connNodes.add(selectedNodeId);
      rawEdges.forEach(e => {
        if (e.source === selectedNodeId) {
          connNodes.add(e.target);
          connEdges.add(e.id);
        }
        if (e.target === selectedNodeId) {
          connNodes.add(e.source);
          connEdges.add(e.id);
        }
      });
    }

    // Filter visible edges based on visible nodes and relationship filters
    const finalEdges = rawEdges.filter(edge => {
      if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return false;
      if (selectedRelType !== 'all' && edge.relationship_type !== selectedRelType) return false;
      if (isIsolateMode && selectedNodeId) {
        return edge.source === selectedNodeId || edge.target === selectedNodeId;
      }
      return true;
    });

    // If Isolate Mode is ON, restrict visible nodes to selected neighborhood
    if (isIsolateMode && selectedNodeId) {
      filteredNodes = filteredNodes.filter(n => connNodes.has(n.id));
    }

    return {
      visibleNodes: filteredNodes,
      visibleEdges: finalEdges,
      connectedNodeIds: connNodes,
      connectedEdgeIds: connEdges
    };
  }, [
    data.nodes,
    data.edges,
    nodeSearch,
    selectedResourceType,
    selectedRelType,
    onlyVerified,
    excludeDemoData,
    selectedNodeId,
    isIsolateMode
  ]);

  // Selected entities
  const selectedNode = useMemo(() => {
    return data.nodes.find(n => n.id === selectedNodeId) || null;
  }, [data.nodes, selectedNodeId]);

  const selectedEdge = useMemo(() => {
    return data.edges.find(e => e.id === selectedEdgeId) || null;
  }, [data.edges, selectedEdgeId]);

  // Node position resolver with fallback
  const getNodePos = useCallback(
    (id: string) => {
      return nodePositions[id] || { x: 600, y: 400 };
    },
    [nodePositions]
  );

  // Pan & Zoom controls
  const handleZoom = useCallback((delta: number, clientCenter?: { x: number; y: number }) => {
    setZoom(prevZoom => {
      const newZoom = Math.min(2.8, Math.max(0.35, Number((prevZoom + delta).toFixed(2))));
      if (clientCenter && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = clientCenter.x - rect.left;
        const mouseY = clientCenter.y - rect.top;
        const scaleFactor = newZoom / prevZoom;
        setPan(prevPan => ({
          x: mouseX - (mouseX - prevPan.x) * scaleFactor,
          y: mouseY - (mouseY - prevPan.y) * scaleFactor
        }));
      }
      return newZoom;
    });
  }, []);

  const handleZoomIn = () => handleZoom(0.25);
  const handleZoomOut = () => handleZoom(-0.25);

  const handleFitReset = useCallback(() => {
    if (visibleNodes.length === 0 || !containerRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    visibleNodes.forEach(n => {
      const pos = getNodePos(n.id);
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    const padding = 100;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const rect = containerRef.current.getBoundingClientRect();

    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const fitScale = Math.min(1.4, Math.max(0.4, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setZoom(fitScale);
    setPan({
      x: rect.width / 2 - midX * fitScale,
      y: rect.height / 2 - midY * fitScale
    });
  }, [visibleNodes, getNodePos]);

  // Center on a specific node
  const handleCenterOnNode = useCallback(
    (nodeId: string) => {
      const pos = getNodePos(nodeId);
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const targetZoom = Math.max(zoom, 1.1);
      setZoom(targetZoom);
      setPan({
        x: rect.width / 2 - pos.x * targetZoom,
        y: rect.height / 2 - pos.y * targetZoom
      });
      setSelectedNodeId(nodeId);
    },
    [getNodePos, zoom]
  );

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag canvas if background was clicked
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      // Interactive node dragging
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      setNodePositions(prev => ({
        ...prev,
        [draggedNodeId]: { x: Math.round(mouseCanvasX), y: Math.round(mouseCanvasY) }
      }));
      return;
    }

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  // Wheel zoom with canvas focal point
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoom(delta, { x: e.clientX, y: e.clientY });
  };

  // Touch handlers for mobile pan & pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
      setTouchDistance(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchDistance(Math.sqrt(dx * dx + dy * dy));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && touchDistance !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const diff = newDist - touchDistance;
      if (Math.abs(diff) > 4) {
        handleZoom(diff > 0 ? 0.08 : -0.08);
        setTouchDistance(newDist);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(null);
    setDraggedNodeId(null);
  };

  // Node Click
  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  // Node Double Click -> Jump to Resource Detail
  const handleNodeDoubleClick = (node: GraphNode) => {
    if (node.resource_type !== 'provider' && node.resource_type !== 'tool' && node.resource_type !== 'droid') {
      onSelectResource(node.slug);
    }
  };

  // Edge Click
  const handleEdgeClick = (edge: GraphEdge, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdgeId(edge.id);
  };

  // Minimap calculations
  const minimapNodes = useMemo(() => {
    return visibleNodes.map(n => ({
      id: n.id,
      pos: getNodePos(n.id),
      type: n.resource_type,
      selected: n.id === selectedNodeId
    }));
  }, [visibleNodes, getNodePos, selectedNodeId]);

  return (
    <div
      className={`flex flex-col select-none transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#070A11] p-3'
          : 'relative w-full rounded-xl border border-slate-800/80 bg-[#080B12] shadow-2xl'
      }`}
    >
      {/* ===================================================================== */}
      {/* 1. KNOWLEDGE GRAPH COMMAND HEADER                                     */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-800/80 bg-[#0A0E18]/90 backdrop-blur-md rounded-t-xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg border border-blue-500/30 bg-blue-950/40 flex items-center justify-center shrink-0 shadow-inner">
            <Network className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="font-semibold tracking-wider uppercase">AI HEAVEN KNOWLEDGE ENGINE</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">AUTHORITATIVE ONTOLOGY</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-mono">{visibleNodes.length} NODES</span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400 font-mono">{visibleEdges.length} RELATIONSHIPS</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2 font-mono">
              <span>Universal AI Knowledge Graph</span>
              {isIsolateMode && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  ISOLATED NEIGHBORHOOD
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Living topological map of foundation models, platform runtimes, APIs, MCP servers, autonomous droids, and verification proofs.
            </p>
          </div>
        </div>

        {/* Action Buttons & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Node Search */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={nodeSearch}
              onChange={e => setNodeSearch(e.target.value)}
              placeholder="Search nodes, models, APIs..."
              className="w-full rounded-md border border-slate-800 bg-slate-900/80 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
            />
            {nodeSearch && (
              <button
                onClick={() => setNodeSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Node Type Filter */}
          <select
            value={selectedResourceType}
            onChange={e => setSelectedResourceType(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900/80 py-1.5 px-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/60 font-mono"
            aria-label="Filter entity category"
          >
            <option value="all">All Entities ({data.nodes.length})</option>
            <option value="provider">Providers</option>
            <option value="model">Foundation Models</option>
            <option value="platform">Platforms & IDEs</option>
            <option value="api">APIs & Endpoints</option>
            <option value="sdk">SDKs & Libraries</option>
            <option value="mcp_server">MCP Servers</option>
            <option value="tool">Platform Tools</option>
            <option value="droid">Autonomous Droids</option>
          </select>

          {/* Relationship Filter */}
          <select
            value={selectedRelType}
            onChange={e => setSelectedRelType(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900/80 py-1.5 px-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/60 font-mono"
            aria-label="Filter relationship edge type"
          >
            <option value="all">All Relationships</option>
            <option value="provides">provides</option>
            <option value="accesses">accesses</option>
            <option value="uses_tool">uses_tool</option>
            <option value="integrates_with">integrates_with</option>
            <option value="compatible_with">compatible_with</option>
            <option value="alternative_to">alternative_to</option>
            <option value="publishes">publishes</option>
          </select>

          {/* Isolate Mode Toggle */}
          <button
            onClick={() => setIsIsolateMode(prev => !prev)}
            disabled={!selectedNodeId}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors border ${
              isIsolateMode
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                : selectedNodeId
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700'
                : 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
            }`}
            title={selectedNodeId ? 'Isolate 1-hop neighborhood' : 'Select a node first to isolate'}
          >
            {isIsolateMode ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-slate-400" />}
            <span>{isIsolateMode ? 'Isolated' : 'Isolate'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-1.5 rounded-md border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. INTERACTIVE GRAPH CANVAS & HUD WORKSPACE                           */}
      {/* ===================================================================== */}
      <div
        className={`relative w-full overflow-hidden bg-[#070A11] ${
          isFullscreen ? 'flex-1 h-[calc(100vh-140px)]' : 'h-[620px] sm:h-[720px]'
        }`}
      >
        {/* Floating Controls HUD (Top Left) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 rounded-lg border border-slate-800/80 bg-[#0B0F19]/90 p-1.5 shadow-xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
            title="Zoom In (or Scroll Wheel)"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
            title="Zoom Out (or Scroll Wheel)"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitReset}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
            title="Fit to Center / Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <div className="px-1 text-[10px] font-mono text-center text-slate-500 font-semibold">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Legend Panel (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex flex-col gap-1.5 rounded-lg border border-slate-800/80 bg-[#0B0F19]/90 p-3 shadow-xl backdrop-blur-md max-w-xs text-xs font-mono">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-800">
            Ontology Legend
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <span className="text-slate-300">Provider Hub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              <span className="text-slate-300">Foundation Model</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-slate-300">Platform / IDE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <span className="text-slate-300">API Gateway</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-slate-300">Autonomous Droid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              <span className="text-slate-300">Platform Tool</span>
            </div>
          </div>
        </div>

        {/* Floating Mini-Map (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 hidden lg:block rounded-lg border border-slate-800 bg-[#0A0D16]/95 p-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1 px-1">
            <span>NETWORK RADAR</span>
            <span className="text-slate-400 font-bold">{visibleNodes.length}</span>
          </div>
          <div className="relative w-40 h-28 bg-[#06080F] rounded border border-slate-800/80 overflow-hidden">
            {/* Minimap Node Blips */}
            <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
              {minimapNodes.map(m => (
                <circle
                  key={m.id}
                  cx={m.pos.x}
                  cy={m.pos.y}
                  r={m.selected ? 22 : 12}
                  fill={
                    m.selected
                      ? '#38bdf8'
                      : m.type === 'droid'
                      ? '#22c55e'
                      : m.type === 'model'
                      ? '#a855f7'
                      : m.type === 'platform'
                      ? '#10b981'
                      : '#64748b'
                  }
                  opacity={m.selected ? 1 : 0.75}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* SVG Interactive Visualizer */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className={`h-full w-full touch-none relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <svg
            ref={svgRef}
            className="h-full w-full"
            style={{ willChange: 'transform' }}
          >
            {/* SVG Defs: Radial Gradients, Glow Filters & Markers */}
            <defs>
              {/* Subtle Cosmic Ambient Glow */}
              <radialGradient id="graph-ambient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#0f172a" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#070a11" stopOpacity="0" />
              </radialGradient>

              {/* Node Glow Filters */}
              <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Arrowhead Markers for Edge Relationships */}
              {Object.entries(RELATIONSHIP_CONFIG).map(([relType, cfg]) => (
                <marker
                  key={`marker-${relType}`}
                  id={`marker-${relType}`}
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill={cfg.color} opacity="0.85" />
                </marker>
              ))}
            </defs>

            {/* Background Rect for catching clicks & panning */}
            <rect id="graph-bg" width="100%" height="100%" fill="url(#graph-ambient)" />

            {/* Viewport Transform Group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Subtle grid points in background */}
              <g opacity="0.18">
                {Array.from({ length: 9 }).map((_, r) =>
                  Array.from({ length: 13 }).map((__, c) => (
                    <circle
                      key={`grid-${r}-${c}`}
                      cx={c * 100}
                      cy={r * 100}
                      r="1.2"
                      fill="#64748b"
                    />
                  ))
                )}
              </g>

              {/* ============================================================= */}
              {/* 2A. RENDER RELATIONSHIP EDGES                                 */}
              {/* ============================================================= */}
              <g className="edges-layer">
                {visibleEdges.map(edge => {
                  const sourcePos = getNodePos(edge.source);
                  const targetPos = getNodePos(edge.target);
                  const isSelected = selectedEdgeId === edge.id;
                  const isConnectedToSelected =
                    selectedNodeId &&
                    (edge.source === selectedNodeId || edge.target === selectedNodeId);

                  const relCfg = RELATIONSHIP_CONFIG[edge.relationship_type] || {
                    color: '#64748b',
                    label: edge.relationship_type
                  };

                  const strokeColor = isSelected
                    ? '#38bdf8'
                    : isConnectedToSelected
                    ? relCfg.color
                    : isIsolateMode
                    ? '#1e293b'
                    : '#263449';

                  const strokeWidth = isSelected ? 2.8 : isConnectedToSelected ? 2.2 : 1.2;
                  const strokeOpacity = isSelected ? 1 : isConnectedToSelected ? 0.9 : 0.45;

                  // Quadratic curvature for non-overlapping bidirectional links
                  const dx = targetPos.x - sourcePos.x;
                  const dy = targetPos.y - sourcePos.y;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                  const normX = -dy / dist;
                  const normY = dx / dist;
                  const curveOffset = 18;
                  const ctrlX = (sourcePos.x + targetPos.x) / 2 + normX * curveOffset;
                  const ctrlY = (sourcePos.y + targetPos.y) / 2 + normY * curveOffset;

                  const pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${ctrlX} ${ctrlY} ${targetPos.x} ${targetPos.y}`;

                  // Midpoint along the curve for label
                  const labelX = (sourcePos.x + 2 * ctrlX + targetPos.x) / 4;
                  const labelY = (sourcePos.y + 2 * ctrlY + targetPos.y) / 4;

                  return (
                    <g
                      key={edge.id}
                      className="cursor-pointer group"
                      onClick={e => handleEdgeClick(edge, e)}
                    >
                      {/* Invisible hover hitbox */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="14"
                        className="cursor-pointer"
                      />

                      {/* Visible Edge Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={strokeOpacity}
                        strokeDasharray={relCfg.dash || undefined}
                        markerEnd={`url(#marker-${edge.relationship_type})`}
                        className="transition-all duration-150"
                      />

                      {/* Animated Relationship Flow (Subtle Pulse Particles along Active Links) */}
                      {(isConnectedToSelected || isSelected) && (
                        <circle r="2.5" fill={relCfg.color} opacity="0.9">
                          <animateMotion
                            path={pathD}
                            dur="2.4s"
                            repeatCount="indefinite"
                            keyPoints="0;1"
                            keyTimes="0;1"
                          />
                        </circle>
                      )}

                      {/* Edge Label Badge */}
                      <g
                        transform={`translate(${labelX}, ${labelY})`}
                        opacity={zoom > 0.65 || isConnectedToSelected || isSelected ? 1 : 0}
                        className="transition-opacity"
                      >
                        <rect
                          x="-34"
                          y="-9"
                          width="68"
                          height="18"
                          rx="4"
                          fill="#090D17"
                          stroke={isSelected ? '#38bdf8' : isConnectedToSelected ? relCfg.color : '#1e293b'}
                          strokeWidth={isSelected ? '1.5' : '1'}
                          className="shadow-sm"
                        />
                        <text
                          textAnchor="middle"
                          y="3.5"
                          className={`text-[9px] font-mono select-none pointer-events-none ${
                            isSelected
                              ? 'fill-blue-300 font-bold'
                              : isConnectedToSelected
                              ? 'fill-slate-200'
                              : 'fill-slate-500'
                          }`}
                        >
                          {relCfg.label.replace('_', ' ')}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* ============================================================= */}
              {/* 2B. RENDER KNOWLEDGE NODES                                    */}
              {/* ============================================================= */}
              <g className="nodes-layer">
                {visibleNodes.map(node => {
                  const pos = getNodePos(node.id);
                  const typeCfg = NODE_TYPE_CONFIG[node.resource_type] || DEFAULT_TYPE_CONFIG;
                  const Icon = typeCfg.icon;

                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isConnected = connectedNodeIds.has(node.id);

                  // Opacity attenuation in isolate / selective mode
                  const nodeOpacity = isIsolateMode
                    ? isConnected
                      ? 1
                      : 0.15
                    : selectedNodeId && !isConnected && !isSelected
                    ? 0.4
                    : 1;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer group"
                      opacity={nodeOpacity}
                      onClick={e => handleNodeClick(node, e)}
                      onDoubleClick={() => handleNodeDoubleClick(node)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onMouseDown={() => setDraggedNodeId(node.id)}
                    >
                      {/* Selected halo ring / atmospheric glow */}
                      {(isSelected || isHovered) && (
                        <circle
                          r={typeCfg.radius + 10}
                          fill="none"
                          stroke={typeCfg.color}
                          strokeWidth={isSelected ? 2 : 1.2}
                          strokeDasharray={isSelected ? '4 3' : undefined}
                          opacity={isSelected ? 0.8 : 0.4}
                          className="animate-spin-slow"
                        />
                      )}

                      {/* Main Node Body by Shape */}
                      {typeCfg.shape === 'hexagon' ? (
                        <polygon
                          points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16"
                          fill={typeCfg.bgColor}
                          stroke={isSelected ? '#38bdf8' : typeCfg.color}
                          strokeWidth={isSelected ? 2.8 : 1.8}
                          className="transition-transform group-hover:scale-105"
                        />
                      ) : typeCfg.shape === 'octagon' ? (
                        <polygon
                          points="-12,-30 12,-30 30,-12 30,12 12,30 -12,30 -30,12 -30,-12"
                          fill={typeCfg.bgColor}
                          stroke={isSelected ? '#38bdf8' : typeCfg.color}
                          strokeWidth={isSelected ? 2.8 : 1.8}
                          className="transition-transform group-hover:scale-105"
                        />
                      ) : typeCfg.shape === 'droid' ? (
                        <g>
                          <circle
                            r={typeCfg.radius}
                            fill={typeCfg.bgColor}
                            stroke={isSelected ? '#38bdf8' : typeCfg.color}
                            strokeWidth={isSelected ? 2.8 : 2}
                          />
                          {/* Outer orbital radar tick */}
                          <circle
                            r={typeCfg.radius + 5}
                            fill="none"
                            stroke={typeCfg.color}
                            strokeWidth="1.2"
                            strokeDasharray="6 8"
                            opacity="0.75"
                          />
                        </g>
                      ) : (
                        <circle
                          r={typeCfg.radius}
                          fill={typeCfg.bgColor}
                          stroke={isSelected ? '#38bdf8' : typeCfg.color}
                          strokeWidth={isSelected ? 2.8 : 1.8}
                          className="transition-transform group-hover:scale-105"
                        />
                      )}

                      {/* Inner Icon */}
                      <foreignObject
                        x="-12"
                        y="-12"
                        width="24"
                        height="24"
                        className="pointer-events-none"
                      >
                        <div className="flex items-center justify-center h-full w-full">
                          <Icon className="h-5 w-5" style={{ color: typeCfg.color }} />
                        </div>
                      </foreignObject>

                      {/* Verification Status Pill Indicator */}
                      {node.verification_status === 'verified' && (
                        <circle
                          cx={typeCfg.radius * 0.7}
                          cy={-typeCfg.radius * 0.7}
                          r="5"
                          fill="#10b981"
                          stroke="#080B12"
                          strokeWidth="1.5"
                        >
                          <title>Verified against official specification</title>
                        </circle>
                      )}

                      {/* Node Label Capsule */}
                      <g transform={`translate(0, ${typeCfg.radius + 14})`}>
                        <rect
                          x={-Math.min(95, Math.max(48, node.name.length * 4.4))}
                          y="-9"
                          width={Math.min(190, Math.max(96, node.name.length * 8.8))}
                          height="18"
                          rx="4"
                          fill="#090E19"
                          stroke={isSelected ? '#38bdf8' : '#1e293b'}
                          strokeWidth="1"
                          className="shadow-md"
                        />
                        <text
                          textAnchor="middle"
                          y="3.5"
                          className={`text-[10px] font-mono tracking-tight select-none pointer-events-none ${
                            isSelected
                              ? 'fill-sky-300 font-bold'
                              : isHovered
                              ? 'fill-slate-100'
                              : 'fill-slate-300'
                          }`}
                        >
                          {node.name.length > 22 ? `${node.name.substring(0, 20)}...` : node.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>

        {/* ===================================================================== */}
        {/* 3. PROFESSIONAL NODE & EDGE INSPECTOR (Right Side Drawer / Floating)  */}
        {/* ===================================================================== */}
        {selectedNode && (
          <div className="absolute top-3 right-3 bottom-3 w-80 sm:w-96 z-30 rounded-xl border border-slate-800/90 bg-[#0A0E18]/95 p-4 shadow-2xl backdrop-blur-xl flex flex-col text-xs font-mono overflow-hidden animate-in fade-in-50 duration-150">
            {/* Inspector Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: NODE_TYPE_CONFIG[selectedNode.resource_type]?.bgColor || '#0f172a',
                    borderColor: NODE_TYPE_CONFIG[selectedNode.resource_type]?.borderColor || '#334155'
                  }}
                >
                  {(() => {
                    const InspectorIcon = NODE_TYPE_CONFIG[selectedNode.resource_type]?.icon || DEFAULT_TYPE_CONFIG.icon;
                    return (
                      <InspectorIcon
                        className="h-4 w-4"
                        style={{ color: NODE_TYPE_CONFIG[selectedNode.resource_type]?.color || '#94a3b8' }}
                      />
                    );
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {NODE_TYPE_CONFIG[selectedNode.resource_type]?.label || selectedNode.resource_type}
                    </span>
                    {selectedNode.verification_status === 'verified' && (
                      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-300">
                        <Check className="h-2.5 w-2.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 truncate max-w-[200px]" title={selectedNode.name}>
                    {selectedNode.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCenterOnNode(selectedNode.id)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                  title="Focus & Center"
                >
                  <Compass className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                  title="Close Inspector"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center gap-1 py-2 border-b border-slate-800 text-[11px]">
              {(['metadata', 'contract', 'connections', 'provenance'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveInspectorTab(tab)}
                  className={`flex-1 py-1 rounded text-center capitalize transition-colors ${
                    activeInspectorTab === tab
                      ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {/* TAB 1: METADATA */}
              {activeInspectorTab === 'metadata' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                      Summary Description
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                      {selectedNode.summary || selectedNode.description || 'No descriptive overview recorded.'}
                    </p>
                  </div>

                  {/* Capabilities List */}
                  {selectedNode.capabilities && selectedNode.capabilities.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                        Verified Capabilities ({selectedNode.capabilities.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.capabilities.map((cap, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]"
                          >
                            {cap.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust Score & Verification Invariant */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Trust Score</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {selectedNode.trust_score}/100
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Audit Status</span>
                      <span className="text-xs font-semibold text-slate-200 uppercase">
                        {selectedNode.verification_status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AGENT CONTRACT */}
              {activeInspectorTab === 'contract' && (
                <div className="space-y-2.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Machine-Readable RFC Contract
                  </div>
                  {selectedNode.agent_contract ? (
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Authentication Type</span>
                        <span className="text-slate-200 text-xs font-semibold">
                          {selectedNode.agent_contract.authentication?.type || 'None required'}
                        </span>
                        {selectedNode.agent_contract.authentication?.header_or_param && (
                          <span className="text-[10px] text-blue-400 block mt-0.5">
                            {selectedNode.agent_contract.authentication.header_or_param}
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Invocation Inputs</span>
                        <span className="text-slate-300 text-[11px]">
                          {selectedNode.agent_contract.inputs?.join(', ') || 'Standard JSON Payload'}
                        </span>
                      </div>

                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Deterministic Outputs</span>
                        <span className="text-slate-300 text-[11px]">
                          {selectedNode.agent_contract.outputs?.join(', ') || 'Typed Return Object'}
                        </span>
                      </div>

                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Cost & Rate Limits</span>
                        <span className="text-slate-400 text-[11px] block">
                          {selectedNode.agent_contract.rate_limits || 'Standard Platform Quota'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                      No explicit RFC contract schema required for this infrastructure entity.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RELATIONSHIPS & CONNECTIONS */}
              {activeInspectorTab === 'connections' && (
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Graph Links ({connectedNodeIds.size - 1} connected)
                  </div>
                  <div className="space-y-1.5">
                    {data.edges
                      .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map(e => {
                        const isOutgoing = e.source === selectedNode.id;
                        const otherNodeId = isOutgoing ? e.target : e.source;
                        const otherNode = data.nodes.find(n => n.id === otherNodeId);
                        const relCfg = RELATIONSHIP_CONFIG[e.relationship_type] || {
                          color: '#64748b',
                          label: e.relationship_type
                        };

                        return (
                          <div
                            key={e.id}
                            onClick={() => handleCenterOnNode(otherNodeId)}
                            className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 cursor-pointer flex items-center justify-between group transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: relCfg.color }}
                              />
                              <div className="truncate">
                                <span className="text-[10px] text-slate-500 mr-1.5">
                                  {isOutgoing ? '→' : '←'} {e.relationship_type.replace('_', ' ')}:
                                </span>
                                <span className="text-xs text-slate-200 group-hover:text-blue-300 font-semibold">
                                  {otherNode?.name || otherNodeId}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-blue-400 shrink-0" />
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 4: PROVENANCE & AUDIT */}
              {activeInspectorTab === 'provenance' && (
                <div className="space-y-2.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Provenance Audit Trail
                  </div>
                  <div className="space-y-2 bg-slate-900/50 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Source Provider</span>
                      <span className="text-slate-200 text-xs font-semibold">
                        {selectedNode.provenance?.source_provider || selectedNode.provider_id || 'AI Heaven Registry'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Source Type</span>
                      <span className="text-slate-300 text-xs">
                        {selectedNode.provenance?.source_type || 'official_documentation'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Sync Timestamp</span>
                      <span className="text-slate-400 text-[11px]">
                        {selectedNode.provenance?.last_verified_at || new Date().toISOString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Authoritative Classification</span>
                      <span
                        className={`text-xs font-bold ${
                          selectedNode.is_demo_data ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {selectedNode.is_demo_data ? 'DEMO STAGING RECORD' : 'VERIFIED PRODUCTION DATA'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              {selectedNode.documentation_url && (
                <a
                  href={selectedNode.documentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Docs</span>
                </a>
              )}

              {selectedNode.resource_type !== 'provider' &&
                selectedNode.resource_type !== 'tool' &&
                selectedNode.resource_type !== 'droid' && (
                  <button
                    onClick={() => onSelectResource(selectedNode.slug)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
                  >
                    <ArrowRight className="h-3 w-3" />
                    <span>View Detail</span>
                  </button>
                )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* 4. EDGE INSPECTOR MODAL/CARD                                          */}
        {/* ===================================================================== */}
        {selectedEdge && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[90%] rounded-xl border border-slate-800 bg-[#0B0F19]/95 p-3.5 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 text-xs font-mono animate-in slide-in-from-bottom duration-150">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  RELATIONSHIP VERIFICATION AUDIT
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-[10px]">
                  Confidence: {Math.round(selectedEdge.confidence * 100)}%
                </span>
              </div>
              <div className="text-slate-100 font-bold mb-1">
                {selectedEdge.source} → {selectedEdge.relationship_type.replace('_', ' ')} → {selectedEdge.target}
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedEdge.description || 'Authoritative relationship attested by provider architecture.'}
              </p>
              {selectedEdge.evidence_url && (
                <a
                  href={selectedEdge.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1.5"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  <span>Inspect Official Documentation Proof</span>
                </a>
              )}
            </div>
            <button
              onClick={() => setSelectedEdgeId(null)}
              className="text-slate-400 hover:text-slate-100 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
