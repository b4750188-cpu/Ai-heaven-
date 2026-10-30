import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Globe,
  Radio,
  Satellite,
  Plane,
  Ship,
  Flame,
  Activity,
  Search,
  RefreshCw,
  Compass,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Layers,
  Database,
  Eye,
  Sliders,
  Send,
  Sparkles,
  MapPin,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  GeointEntity,
  GeointLayerConfig,
  GeointCategory,
  SatellitePassPrediction,
  GeointInvestigationReport
} from '../../types/geoint';

interface EyesForAllWorkspaceProps {
  currentUser?: any;
  onOpenAuth?: () => void;
  onNavigateToSource?: () => void;
}

type HudOpticMode = 'standard' | 'flir_thermal' | 'night_vision' | 'radar_hud';

export const EyesForAllWorkspace: React.FC<EyesForAllWorkspaceProps> = ({
  currentUser,
  onOpenAuth,
  onNavigateToSource
}) => {
  // Telemetry & Layer States
  const [layers, setLayers] = useState<GeointLayerConfig[]>([]);
  const [entities, setEntities] = useState<GeointEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<GeointEntity | null>(null);
  const [activeCategories, setActiveCategories] = useState<Record<GeointCategory, boolean>>({
    aircraft: true,
    satellite: true,
    earthquake: true,
    wildfire: true,
    maritime: true,
    severe_weather: true
  });

  // UI & HUD States
  const [opticMode, setOpticMode] = useState<HudOpticMode>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  // Satellite Pass Predictor Tool
  const [predictLat, setPredictLat] = useState('37.7749');
  const [predictLon, setPredictLon] = useState('-122.4194');
  const [predictedPasses, setPredictedPasses] = useState<SatellitePassPrediction[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);

  // Correlation & Central Brain Query
  const [correlateTarget, setCorrelateTarget] = useState('Northern California Datacenter');
  const [correlateLat, setCorrelateLat] = useState('37.4419');
  const [correlateLon, setCorrelateLon] = useState('-122.1430');
  const [investigationReport, setInvestigationReport] = useState<GeointInvestigationReport | null>(null);
  const [isCorrelating, setIsCorrelating] = useState(false);

  // Natural Language Geo Query
  const [geoQueryText, setGeoQueryText] = useState('');
  const [geoQueryAnswer, setGeoQueryAnswer] = useState<string | null>(null);
  const [isAnsweringGeo, setIsAnsweringGeo] = useState(false);

  // Three.js Canvas Reference & Globe Scene
  const mountRef = useRef<HTMLDivElement>(null);
  const globeSceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globeGroup: THREE.Group;
    markersGroup: THREE.Group;
    isDragging: boolean;
    prevMousePos: { x: number; y: number };
    animId?: number;
  } | null>(null);

  // Quick Strategic Hotspots
  const strategicHotspots = [
    { name: 'Panama Canal', lat: 9.0714, lon: -79.7124, desc: 'Maritime Chokepoint' },
    { name: 'Strait of Malacca', lat: 1.2583, lon: 103.8647, desc: 'Primary Oil Transit' },
    { name: 'San Andreas Fault', lat: 35.1200, lon: -119.5500, desc: 'Tectonic Rift Zone' },
    { name: 'Pacific Ring of Fire (Japan)', lat: 35.6762, lon: 139.6503, desc: 'High Seismic Zone' },
    { name: 'Low Earth Orbit (ISS)', lat: 0, lon: 0, desc: 'Orbital Reconnaissance' }
  ];

  // 1. Initial Load of Layers and Telemetry
  useEffect(() => {
    loadAllTelemetry();
    const interval = setInterval(() => {
      refreshEntitiesQuietly();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const loadAllTelemetry = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [layersRes, entitiesRes] = await Promise.all([
        apiClient.getGeointLayers(),
        apiClient.getGeointEntities({ limit: 300 })
      ]);
      setLayers(layersRes);
      setEntities(entitiesRes);
      if (entitiesRes.length > 0 && !selectedEntity) {
        setSelectedEntity(entitiesRes[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to spatial telemetry providers.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEntitiesQuietly = async () => {
    try {
      const entitiesRes = await apiClient.getGeointEntities({ limit: 300 });
      setEntities(entitiesRes);
    } catch {
      // Non-blocking background catch
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      await loadAllTelemetry();
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Three.js Photorealistic 3D Globe Initialization
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.replaceChildren(renderer.domElement);

    // Root Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Markers Group
    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);

    const radius = 75;

    // Procedural Earth Globe Canvas Texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep space ocean base
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Graticules
    ctx.strokeStyle = '#0f2744';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Stylized procedural continent landmasses
    ctx.fillStyle = '#163854';
    // North America
    ctx.beginPath();
    ctx.ellipse(280, 160, 110, 70, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // South America
    ctx.beginPath();
    ctx.ellipse(340, 320, 60, 95, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Eurasia
    ctx.beginPath();
    ctx.ellipse(660, 160, 190, 85, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Africa
    ctx.beginPath();
    ctx.ellipse(540, 270, 75, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    // Australia
    ctx.beginPath();
    ctx.ellipse(840, 340, 55, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    const globeTexture = new THREE.CanvasTexture(canvas);
    const globeGeometry = new THREE.SphereGeometry(radius, 48, 48);

    // Base Globe Material with glow
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: globeTexture,
      shininess: 25,
      specular: new THREE.Color('#1d4ed8'),
      emissive: new THREE.Color('#030712')
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globeMesh);

    // Atmosphere Glow Shell
    const atmosphereGeo = new THREE.SphereGeometry(radius * 1.04, 32, 32);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphereMesh);

    // Orbit Ring Shell (Low Earth Orbit ring)
    const ringGeo = new THREE.RingGeometry(radius * 1.28, radius * 1.30, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#6366f1'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const leoRing = new THREE.Mesh(ringGeo, ringMat);
    leoRing.rotation.x = Math.PI / 3;
    globeGroup.add(leoRing);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    dirLight.position.set(120, 80, 150);
    scene.add(dirLight);

    // Mouse Drag Interaction
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      globeGroup.rotation.y += dx * 0.005;
      globeGroup.rotation.x += dy * 0.005;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.min(360, Math.max(120, camera.position.z + e.deltaY * 0.15));
    };

    // Mobile Touch Gesture Support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMousePos.x;
      const dy = e.touches[0].clientY - prevMousePos.y;
      globeGroup.rotation.y += dx * 0.006;
      globeGroup.rotation.x += dy * 0.006;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        globeGroup.rotation.y += 0.0012; // Gentle planetary rotation
      }
      renderer.render(scene, camera);
    };
    animate();

    globeSceneRef.current = {
      scene,
      camera,
      renderer,
      globeGroup,
      markersGroup,
      isDragging,
      prevMousePos,
      animId
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
    };
  }, []);

  // 3. Render 3D Entity Markers on the Globe
  useEffect(() => {
    if (!globeSceneRef.current) return;
    const { markersGroup } = globeSceneRef.current;

    // Clear old markers
    while (markersGroup.children.length > 0) {
      const obj = markersGroup.children[0];
      markersGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) (obj as any).material.dispose();
    }

    const baseRadius = 75;

    // Filter by active categories and search query
    const visible = entities.filter(e => {
      if (!activeCategories[e.category]) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        return (
          e.name.toLowerCase().includes(q) ||
          (e.callsign && e.callsign.toLowerCase().includes(q)) ||
          e.id.toLowerCase().includes(q) ||
          e.sourceProvider.toLowerCase().includes(q)
        );
      }
      return true;
    });

    for (const ent of visible) {
      const latRad = (ent.position.latitude * Math.PI) / 180;
      const lonRad = (ent.position.longitude * Math.PI) / 180;

      // Position based on category altitude
      let altitudeOffset = 0;
      let colorHex = 0x38bdf8;
      let markerSize = 1.2;

      if (ent.category === 'satellite') {
        altitudeOffset = 22; // Low Earth Orbit altitude visual height
        colorHex = 0xa855f7; // Purple
        markerSize = 1.6;
      } else if (ent.category === 'aircraft') {
        altitudeOffset = 4; // High flight level
        colorHex = 0xf59e0b; // Amber
        markerSize = 1.2;
      } else if (ent.category === 'earthquake') {
        altitudeOffset = 0.5;
        const mag = (ent.metadata.mag as number) || 2.5;
        colorHex = mag >= 5.0 ? 0xef4444 : 0xf97316; // Red/Orange
        markerSize = Math.max(1.2, mag * 0.7);
      } else if (ent.category === 'wildfire') {
        altitudeOffset = 0.5;
        colorHex = 0xdc2626; // Ruby
        markerSize = 1.8;
      } else if (ent.category === 'maritime') {
        altitudeOffset = 0.2;
        colorHex = 0x10b981; // Emerald
        markerSize = 1.4;
      }

      const r = baseRadius + altitudeOffset;
      // Spherical coordinate translation
      const x = r * Math.cos(latRad) * Math.sin(lonRad);
      const y = r * Math.sin(latRad);
      const z = r * Math.cos(latRad) * Math.cos(lonRad);

      const markerGeo = new THREE.SphereGeometry(markerSize, 12, 12);
      const markerMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.set(x, y, z);

      markerMesh.userData = { entityId: ent.id };
      markersGroup.add(markerMesh);
    }
  }, [entities, activeCategories, searchQuery]);

  // Jump globe to target lat/lon
  const jumpToLocation = (lat: number, lon: number) => {
    if (!globeSceneRef.current) return;
    const { globeGroup } = globeSceneRef.current;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    globeGroup.rotation.y = -lonRad + Math.PI / 2;
    globeGroup.rotation.x = latRad;
  };

  // Deposit Selected Entity to SOURCE
  const handleDepositToSource = async () => {
    if (!selectedEntity) return;
    setIsDepositing(true);
    setDepositSuccessMsg(null);
    try {
      const res = await apiClient.depositGeointEntityToSource(
        selectedEntity,
        'Manually verified and pinned from Eyes for All spatial telemetry console.'
      );
      setDepositSuccessMsg(`Deposited to SOURCE! Entry ID: ${res.sourceEntryId}`);
      setTimeout(() => setDepositSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(`Deposit error: ${err.message}`);
    } finally {
      setIsDepositing(false);
    }
  };

  // Run Satellite Pass Prediction
  const handlePredictPasses = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    try {
      const lat = parseFloat(predictLat);
      const lon = parseFloat(predictLon);
      const res = await apiClient.predictGeointSatellitePass({
        latitude: lat,
        longitude: lon,
        locationName: 'Operator Target'
      });
      setPredictedPasses(res.passes);
      jumpToLocation(lat, lon);
    } catch (err: any) {
      setErrorMsg(`Prediction fault: ${err.message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  // Run Spatial Correlation Analysis
  const handleRunCorrelation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCorrelating(true);
    try {
      const lat = parseFloat(correlateLat);
      const lon = parseFloat(correlateLon);
      const res = await apiClient.correlateGeointTarget({
        targetName: correlateTarget,
        targetLat: lat,
        targetLon: lon,
        radiusKm: 300
      });
      setInvestigationReport(res);
      jumpToLocation(lat, lon);
    } catch (err: any) {
      setErrorMsg(`Correlation error: ${err.message}`);
    } finally {
      setIsCorrelating(false);
    }
  };

  // Natural Language Ask Horus-09
  const handleAskHorus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geoQueryText.trim()) return;
    setIsAnsweringGeo(true);
    setGeoQueryAnswer(null);
    try {
      const conv = await apiClient.createConversation('Eyes for All Spatial Inquiry', 'gemini-2.5-pro');
      const res = await apiClient.chatInConversation(conv.id, `eyes for all: ${geoQueryText.trim()}`);
      setGeoQueryAnswer(res.assistantMessage?.content || 'No response from Horus-09.');
    } catch (err: any) {
      setGeoQueryAnswer(`Error: ${err.message}`);
    } finally {
      setIsAnsweringGeo(false);
    }
  };

  // Category Icon & Color Mapping
  const getCategoryBadge = (category: GeointCategory) => {
    switch (category) {
      case 'satellite':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-950/70 border border-purple-800/80 text-purple-300"><Satellite className="w-3 h-3 text-purple-400" /> SATELLITE</span>;
      case 'aircraft':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/70 border border-amber-800/80 text-amber-300"><Plane className="w-3 h-3 text-amber-400" /> ADS-B FLIGHT</span>;
      case 'earthquake':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-950/70 border border-rose-800/80 text-rose-300"><Activity className="w-3 h-3 text-rose-400" /> SEISMIC</span>;
      case 'wildfire':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-red-950/70 border border-red-800/80 text-red-300"><Flame className="w-3 h-3 text-red-400" /> WILDFIRE</span>;
      case 'maritime':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300"><Ship className="w-3 h-3 text-emerald-400" /> MARITIME AIS</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-900 border border-slate-700 text-slate-300"><Globe className="w-3 h-3 text-slate-400" /> SPATIAL</span>;
    }
  };

  // Optical HUD Styling Filters
  const getOpticOverlayClass = () => {
    switch (opticMode) {
      case 'flir_thermal':
        return 'contrast-125 saturate-200 hue-rotate-15 filter brightness-110 sepia-[0.3]';
      case 'night_vision':
        return 'contrast-125 brightness-125 saturate-150 filter hue-rotate-90 sepia-[0.6]';
      case 'radar_hud':
        return 'contrast-115 filter';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/70 text-cyan-400 shadow-sm shadow-cyan-950/40">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-wide text-slate-100">Eyes for All</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
                GOD'S EYE VIEW 2.0
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                DROID: HORUS-09 (EYE_OF_RA)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Global 3D Situational Telemetry &bull; Real-World Aircraft, Satellites, Seismic & Hazard Layers
            </p>
          </div>
        </div>

        {/* Global Controls & Refresh */}
        <div className="flex items-center gap-2">
          {/* Optical Mode Selector with Explicit Synthetic Shader Label */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg text-xs font-mono">
            <span className="px-2 text-slate-500 text-[10px] uppercase tracking-wider" title="Synthetic GLSL post-processing viewport shaders; not calibrated thermal sensor hardware">HUD Shader (Simulated):</span>
            <button
              onClick={() => setOpticMode('standard')}
              className={`px-2 py-1 rounded transition-colors ${opticMode === 'standard' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' : 'text-slate-400 hover:text-slate-200'}`}
              title="Standard true-color viewport"
            >
              Standard
            </button>
            <button
              onClick={() => setOpticMode('flir_thermal')}
              className={`px-2 py-1 rounded transition-colors ${opticMode === 'flir_thermal' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-slate-200'}`}
              title="Simulated FLIR thermal color-ramp shader filter (Visual simulation only; not calibrated radiometer)"
            >
              FLIR (Simulated)
            </button>
            <button
              onClick={() => setOpticMode('night_vision')}
              className={`px-2 py-1 rounded transition-colors ${opticMode === 'night_vision' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'text-slate-400 hover:text-slate-200'}`}
              title="Simulated green-phosphor night vision shader filter (Visual simulation only; not optical sensor)"
            >
              NVG (Simulated)
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-mono text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh Live Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 relative overflow-hidden">
        {/* Left Column: 3D Globe View & Tactical HUD Overlay */}
        <div className="lg:col-span-8 flex flex-col relative h-[65vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950">
          {/* Tactical HUD Header Bar Inside Globe */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Search Box (Pointer events enabled) */}
            <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-lg w-full sm:w-72 shadow-lg">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search callsign, satellite, quake..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Live Telemetry Counts */}
            <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 shadow-lg pointer-events-auto">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                {entities.length} TARGETS LOADED
              </span>
            </div>
          </div>

          {/* Strategic Hotspots Navigation Bar */}
          <div className="absolute top-14 left-3 z-20 hidden sm:flex flex-wrap items-center gap-1 pointer-events-auto">
            <span className="text-[10px] font-mono text-slate-500 px-1 uppercase tracking-wider">Hotspots:</span>
            {strategicHotspots.map(h => (
              <button
                key={h.name}
                onClick={() => jumpToLocation(h.lat, h.lon)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 transition-colors"
              >
                {h.name}
              </button>
            ))}
          </div>

          {/* Three.js Globe Mounting Container */}
          <div
            ref={mountRef}
            className={`flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden ${getOpticOverlayClass()}`}
          />

          {/* Tactical Crosshair Watermark & Globe Legend */}
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex flex-col gap-1 text-[10px] font-mono text-slate-500 bg-slate-950/80 backdrop-blur px-2.5 py-1.5 rounded border border-slate-800/80">
            <div>ORBITAL TRACKING: LEO SGP4 PROPAGATION &bull; SATELLITES ACTIVE</div>
            <div>AIRSPACE ADS-B: OPENSKY NETWORK &bull; SEISMIC: USGS HAZARDS</div>
            <div>CLICK + DRAG TO ROTATE &bull; SCROLL TO ZOOM &bull; TOUCH FRIENDLY</div>
            {opticMode !== 'standard' && (
              <div className="text-amber-400 font-bold tracking-wider">
                &bull; NOTICE: ACTIVE SHADER IS A SYNTHETIC POST-PROCESSING VISUAL FILTER (NOT REAL THERMAL SENSOR DATA)
              </div>
            )}
          </div>

          {/* Layer Selector Bar at Bottom of Globe View */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 p-1.5 rounded-lg shadow-xl max-w-[90vw] overflow-x-auto">
            <button
              onClick={() => setActiveCategories(p => ({ ...p, aircraft: !p.aircraft }))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCategories.aircraft ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Aircraft</span>
            </button>

            <button
              onClick={() => setActiveCategories(p => ({ ...p, satellite: !p.satellite }))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCategories.satellite ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satellites</span>
            </button>

            <button
              onClick={() => setActiveCategories(p => ({ ...p, earthquake: !p.earthquake }))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCategories.earthquake ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Earthquakes</span>
            </button>

            <button
              onClick={() => setActiveCategories(p => ({ ...p, wildfire: !p.wildfire }))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCategories.wildfire ? 'bg-red-950/80 text-red-300 border border-red-800/80' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Wildfires</span>
            </button>

            <button
              onClick={() => setActiveCategories(p => ({ ...p, maritime: !p.maritime }))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeCategories.maritime ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>Maritime</span>
            </button>
          </div>
        </div>

        {/* Right Column: Telemetry Inspector, Pass Predictor, and Intelligence Console */}
        <div className="lg:col-span-4 flex flex-col h-auto lg:h-[calc(100vh-57px)] overflow-y-auto bg-slate-900/40 p-4 space-y-4">
          {/* Feedback & Notice Banner */}
          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-800/70 bg-rose-950/30 text-rose-300 text-xs font-mono flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
                &times;
              </button>
            </div>
          )}

          {depositSuccessMsg && (
            <div className="p-3 rounded-lg border border-emerald-800/70 bg-emerald-950/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {depositSuccessMsg}
              </span>
              <button
                onClick={onNavigateToSource}
                className="underline hover:text-emerald-100 ml-2"
              >
                View in SOURCE
              </button>
            </div>
          )}

          {/* 1. Target Telemetry Inspector Card */}
          <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/80 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Target Telemetry Inspector
                </h2>
              </div>
              {selectedEntity && getCategoryBadge(selectedEntity.category)}
            </div>

            {selectedEntity ? (
              <div className="mt-3 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    {selectedEntity.name}
                    {selectedEntity.callsign && (
                      <span className="text-xs font-mono text-cyan-400">
                        [{selectedEntity.callsign}]
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                    <span>ID: {selectedEntity.id}</span>
                    <span>&bull;</span>
                    <span className="capitalize">{selectedEntity.dataStatus} Telemetry</span>
                  </div>
                </div>

                {/* Spatial Position Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Latitude</span>
                    <div className="text-slate-200">{selectedEntity.position.latitude.toFixed(4)}&deg;</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Longitude</span>
                    <div className="text-slate-200">{selectedEntity.position.longitude.toFixed(4)}&deg;</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Altitude</span>
                    <div className="text-slate-200">
                      {selectedEntity.position.altitudeMeters
                        ? `${Math.round(selectedEntity.position.altitudeMeters)} m`
                        : 'Surface'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Speed / Heading</span>
                    <div className="text-slate-200">
                      {selectedEntity.speedKts ? `${selectedEntity.speedKts} kts` : 'N/A'}
                      {selectedEntity.headingDeg !== undefined ? ` @ ${selectedEntity.headingDeg}&deg;` : ''}
                    </div>
                  </div>
                </div>

                {/* Provenance & Seal */}
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-slate-500">Provider:</span>
                    <span className="text-slate-300">{selectedEntity.sourceProvider}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="text-slate-300">
                      {new Date(selectedEntity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-slate-500">Evidence SHA-256:</span>
                    <span className="text-cyan-400">
                      {selectedEntity.sha256EvidenceSeal.slice(0, 16)}...
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() =>
                      jumpToLocation(
                        selectedEntity.position.latitude,
                        selectedEntity.position.longitude
                      )
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition-colors"
                  >
                    Center on Globe
                  </button>

                  <button
                    onClick={handleDepositToSource}
                    disabled={isDepositing}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-900/80 hover:bg-indigo-800/80 text-xs font-mono text-indigo-200 border border-indigo-700/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isDepositing ? 'Sealing...' : 'Deposit to SOURCE'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No entity selected. Click any target on the 3D globe or search above.
              </div>
            )}
          </div>

          {/* 2. Overhead Satellite Pass Predictor Tool */}
          <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/80 shadow-md">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
              <Satellite className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Overhead Pass Predictor (SGP4)
              </h2>
            </div>

            <form onSubmit={handlePredictPasses} className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Target Lat</label>
                  <input
                    type="text"
                    value={predictLat}
                    onChange={e => setPredictLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Target Lon</label>
                  <input
                    type="text"
                    value={predictLon}
                    onChange={e => setPredictLon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPredicting}
                className="w-full py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-xs font-mono text-purple-300 border border-purple-800/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{isPredicting ? 'Calculating Passes...' : 'Calculate Next Orbital Passes'}</span>
              </button>
            </form>

            {predictedPasses.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase">
                  <span>Upcoming Satellite Windows:</span>
                  <span className="text-purple-400 font-semibold">[Analytical SGP4 Projection]</span>
                </div>
                {predictedPasses.map(p => (
                  <div
                    key={p.sha256CalculationSeal}
                    className="p-2 rounded bg-slate-950/80 border border-slate-800/70 text-xs font-mono flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>{p.satelliteName}</span>
                        <span className="px-1 py-0.2 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                          PREDICTED
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Max Elev: {p.maxElevationDeg}&deg; &bull; Duration: {p.durationSeconds}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-purple-300">
                        {new Date(p.predictedPassTime).toLocaleTimeString()}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">{p.passType}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Spatial Threat & Infrastructure Correlation */}
          <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/80 shadow-md">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Facility & Target Risk Correlation
              </h2>
            </div>

            <form onSubmit={handleRunCorrelation} className="mt-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">Target Facility Name</label>
                <input
                  type="text"
                  value={correlateTarget}
                  onChange={e => setCorrelateTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Lat</label>
                  <input
                    type="text"
                    value={correlateLat}
                    onChange={e => setCorrelateLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Lon</label>
                  <input
                    type="text"
                    value={correlateLon}
                    onChange={e => setCorrelateLon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCorrelating}
                className="w-full py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 text-xs font-mono text-rose-300 border border-rose-800/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span>{isCorrelating ? 'Correlating Spatial Events...' : 'Correlate Nearby Phenomena'}</span>
              </button>
            </form>

            {investigationReport && (
              <div className="mt-3 space-y-2">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-300">
                  {investigationReport.summary}
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {investigationReport.correlations.map((c, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs font-mono flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{c.entityName}</span>
                        <span className="text-[10px] text-cyan-400">{c.distanceKm.toFixed(1)} km</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{c.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Natural Language Spatial Inquiry with Horus-09 */}
          <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/80 shadow-md">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Ask Specialist Horus-09 (GEOINT)
              </h2>
            </div>

            <form onSubmit={handleAskHorus} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Which earthquakes occurred today?"
                value={geoQueryText}
                onChange={e => setGeoQueryText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-600"
              />
              <button
                type="submit"
                disabled={isAnsweringGeo || !geoQueryText.trim()}
                className="px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-mono transition-colors disabled:opacity-50"
              >
                {isAnsweringGeo ? 'Querying...' : 'Ask'}
              </button>
            </form>

            {geoQueryAnswer && (
              <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {geoQueryAnswer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
