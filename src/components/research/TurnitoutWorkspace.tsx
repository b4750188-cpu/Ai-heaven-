/**
 * AI HEAVEN - Turnitout Document Processing & Academic Writing Workspace
 * 
 * Provides:
 * 1. Deterministic document cleanup & academic prose refinement
 * 2. LaTeX math and code syntax zone protection
 * 3. Multi-language code comment and docstring humanizer
 * 4. Academic discipline taxonomy & BibTeX citation generator
 * 5. Factual capability disclosures and privacy safeguards
 */

import React, { useEffect, useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Code,
  BookOpen,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Sliders,
  Hash,
  Download,
  Info,
  ChevronRight,
  Bookmark
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  AcademicDiscipline,
  BibTeXEntry,
  TurnitoutAnalysisResult,
  TurnitoutMode,
  TurnitoutProcessResult,
  TurnitoutStatus
} from '../../types/turnitout';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const SAMPLE_LATEX = `\\section{Methodology}
In this study, we delve into the optimization of quantum circuits where the continuous state satisfies $\\sum_{i=1}^n |\\psi_i|^2 = 1$. It is crucial to note that gradient descent plays a pivotal role in convergence.
\\begin{equation}
\\mathcal{L}(\\theta) = \\mathbb{E}_{x \\sim \\mathcal{D}} \\left[ \\| f_\\theta(x) - y \\|^2 \\right] + \\lambda \\| \\theta \\|_2^2
\\end{equation}
Furthermore, our empirical analysis serves as a testament to the robustness of the framework. In conclusion, the architecture provides a comprehensive tapestry of numerical validation.`;

const SAMPLE_PYTHON = `# We delve deeply into the training iteration
def optimize_network(weights, gradients, learning_rate=0.001):
    """This function plays a pivotal role in backpropagation."""
    # It is crucial to remember momentum clipping
    clipped_grads = [g * 0.95 for g in gradients]
    updated_weights = [w - learning_rate * g for w, g in zip(weights, clipped_grads)]
    return updated_weights
`;

const SAMPLE_ESSAY = `Artificial intelligence plays a pivotal role in modern software development. In this paper, we delve into the multifaceted challenges faced by distributed engineering teams. It is crucial to note that automated code synthesis serves as a testament to algorithmic progress. Furthermore, a plethora of tools are emerging. In conclusion, machine intelligence stands as a beacon of technological evolution.`;

export const TurnitoutWorkspace: React.FC = () => {
  const [inputText, setInputText] = useState(SAMPLE_LATEX);
  const [mode, setMode] = useState<TurnitoutMode>('academic_refine');
  const [intensity, setIntensity] = useState<number>(2);
  const [discipline, setDiscipline] = useState<AcademicDiscipline>('computer_science');
  const [codeLanguage, setCodeLanguage] = useState<string>('python');
  const [preserveLatex, setPreserveLatex] = useState(true);
  const [preserveCode, setPreserveCode] = useState(true);
  const [citationStyle, setCitationStyle] = useState<'bibtex' | 'ieee' | 'apa'>('bibtex');

  const [status, setStatus] = useState<TurnitoutStatus | null>(null);
  const [taxonomies, setTaxonomies] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<TurnitoutAnalysisResult | null>(null);
  const [result, setResult] = useState<TurnitoutProcessResult | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedBibtex, setCopiedBibtex] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'diff' | 'citations' | 'disclosure'>('editor');

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [statusData, taxData] = await Promise.all([
        apiClient.getTurnitoutStatus(),
        apiClient.getTurnitoutTaxonomies()
      ]);
      setStatus(statusData);
      setTaxonomies(taxData);
    } catch (err) {
      console.error('Failed to load Turnitout metadata:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    try {
      const analysisData = await apiClient.analyzeTurnitoutDocument(inputText);
      setAnalysis(analysisData);
    } catch (err: any) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const res = await apiClient.processTurnitoutDocument({
        text: inputText,
        mode,
        intensity,
        discipline,
        preserveLatex,
        preserveCode,
        codeLanguage,
        citationStyle,
        maxCitations: 3
      });
      setResult(res);
      setActiveTab('editor');
    } catch (err: any) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyProcessed = () => {
    if (!result?.processedText) return;
    navigator.clipboard.writeText(result.processedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyAllBibtex = () => {
    if (!result?.bibtexCitations?.length) return;
    const allBib = result.bibtexCitations.map(b => b.bibtexString).join('\n\n');
    navigator.clipboard.writeText(allBib);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  const loadSample = (sample: string, sampleMode: TurnitoutMode, sampleLang?: string) => {
    setInputText(sample);
    setMode(sampleMode);
    if (sampleLang) setCodeLanguage(sampleLang);
    setResult(null);
    setAnalysis(null);
  };

  return (
    <div className="space-y-6 text-[#F1F4F8]">
      {/* Header and Capability Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-[#121822] border border-[#283242] rounded-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-base font-semibold text-[#F1F4F8] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#42D9F5]" />
              Turnitout Document Refiner & Academic Writing Module
            </h1>
            <Badge variant="info">In-Memory Sandbox</Badge>
            <Badge variant="neutral">LaTeX Math Protected</Badge>
          </div>
          <p className="text-xs text-[#9AA6B7] max-w-3xl">
            Deterministic document cleanup, clarity improvements, and academic prose refinement. Preserves LaTeX equations,
            macros, and multi-language code blocks without sending sensitive manuscripts to external training pools.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className="flex items-center gap-1.5 text-xs font-mono"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : 'text-amber-400'}`} />
            Fast Lexical Audit
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleProcess}
            disabled={isProcessing || !inputText.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Refining...' : 'Execute In-Place Refinement'}
          </Button>
        </div>
      </div>

      {/* Mode and Option Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#121822]/60 border border-[#283242] rounded-lg">
        {/* Transformation Mode */}
        <div>
          <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase mb-1.5">Transformation Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TurnitoutMode)}
            className="w-full bg-[#080B10] border border-[#283242] rounded-md px-2.5 py-1.5 text-xs text-[#F1F4F8] focus:outline-none focus:border-[#42D9F5]"
          >
            <option value="academic_refine">Academic Paper Refinement</option>
            <option value="clarity">Clarity & Readability Simplifier</option>
            <option value="code_comments">Code Comments & Docstrings</option>
            <option value="citation_inject">Academic Citations & BibTeX</option>
          </select>
        </div>

        {/* Intensity Curve */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-mono text-[#9AA6B7] uppercase">Intensity (Log Curve)</label>
            <span className="text-[11px] font-mono text-[#42D9F5]">Level {intensity} / 5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-[#080B10] rounded-lg appearance-none cursor-pointer accent-[#42D9F5]"
          />
          <div className="flex justify-between text-[10px] text-[#9AA6B7]/60 font-mono mt-1">
            <span>Mild</span>
            <span>Balanced (Rec)</span>
            <span>Rigorous</span>
          </div>
        </div>

        {/* Academic Discipline Taxonomy */}
        <div>
          <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase mb-1.5">Discipline Taxonomy</label>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as AcademicDiscipline)}
            className="w-full bg-[#080B10] border border-[#283242] rounded-md px-2.5 py-1.5 text-xs text-[#F1F4F8] focus:outline-none focus:border-[#42D9F5]"
          >
            <option value="computer_science">Computer Science & AI</option>
            <option value="engineering_physics">Engineering & Physics</option>
            <option value="mathematics_statistics">Mathematics & Statistics</option>
            <option value="quantitative_finance">Quantitative Finance</option>
            <option value="medical_life_sciences">Medical & Life Sciences</option>
          </select>
        </div>

        {/* Protected Zones Safeguards */}
        <div>
          <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase mb-1.5">Zone Protections</label>
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-[#9AA6B7] cursor-pointer">
              <input
                type="checkbox"
                checked={preserveLatex}
                onChange={(e) => setPreserveLatex(e.target.checked)}
                className="rounded border-[#283242] bg-[#080B10] text-[#42D9F5] focus:ring-0"
              />
              LaTeX Math ($)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#9AA6B7] cursor-pointer">
              <input
                type="checkbox"
                checked={preserveCode}
                onChange={(e) => setPreserveCode(e.target.checked)}
                className="rounded border-[#283242] bg-[#080B10] text-[#42D9F5] focus:ring-0"
              />
              Code (```)
            </label>
          </div>
        </div>
      </div>

      {/* Fast Samples Row */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[11px] font-mono text-[#9AA6B7]/70">Load Pre-Configured Samples:</span>
        <button
          type="button"
          onClick={() => loadSample(SAMPLE_LATEX, 'academic_refine')}
          className="px-2 py-0.5 rounded border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-[11px] font-mono text-[#42D9F5] cursor-pointer"
        >
          LaTeX Math & Paper
        </button>
        <button
          type="button"
          onClick={() => loadSample(SAMPLE_PYTHON, 'code_comments', 'python')}
          className="px-2 py-0.5 rounded border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-[11px] font-mono text-[#42D9F5] cursor-pointer"
        >
          Python Comments & Docstrings
        </button>
        <button
          type="button"
          onClick={() => loadSample(SAMPLE_ESSAY, 'clarity')}
          className="px-2 py-0.5 rounded border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-[11px] font-mono text-[#42D9F5] cursor-pointer"
        >
          Academic Essay Draft
        </button>
      </div>

      {/* Analysis Metrics Banner (if analysis was run) */}
      {analysis && (
        <div className="p-4 bg-[#121822] border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#F1F4F8] flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#42D9F5]" />
              Lexical Audit & Structural Scan Results
            </h3>
            <span className="text-[11px] font-mono text-[#9AA6B7]">
              Discipline: <span className="text-[#F1F4F8] capitalize">{analysis.detectedDiscipline?.replace('_', ' ')}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="p-2.5 bg-[#080B10] border border-[#283242] rounded">
              <div className="text-[10px] font-mono text-[#9AA6B7]">Flesch Reading Ease</div>
              <div className="text-base font-semibold font-mono text-[#F1F4F8]">{analysis.metrics.fleschKincaidReadingEase} / 100</div>
              <div className="text-[10px] text-[#9AA6B7]/70">
                {analysis.metrics.fleschKincaidReadingEase > 60 ? 'Standard' : 'Academic / Complex'}
              </div>
            </div>

            <div className="p-2.5 bg-[#080B10] border border-[#283242] rounded">
              <div className="text-[10px] font-mono text-[#9AA6B7]">Identified AI Cliches</div>
              <div className="text-base font-semibold font-mono text-amber-400">{analysis.metrics.clicheMatches} matches</div>
              <div className="text-[10px] text-[#9AA6B7]/70">Candidate phrases</div>
            </div>

            <div className="p-2.5 bg-[#080B10] border border-[#283242] rounded">
              <div className="text-[10px] font-mono text-[#9AA6B7]">Protected LaTeX Zones</div>
              <div className="text-base font-semibold font-mono text-[#42D9F5]">{analysis.detectedZones.latexZones} math blocks</div>
              <div className="text-[10px] text-[#9AA6B7]/70">Zero-mutation guaranteed</div>
            </div>

            <div className="p-2.5 bg-[#080B10] border border-[#283242] rounded">
              <div className="text-[10px] font-mono text-[#9AA6B7]">Word & Sentence Count</div>
              <div className="text-base font-semibold font-mono text-[#F1F4F8]">{analysis.metrics.wordCount} words</div>
              <div className="text-[10px] text-[#9AA6B7]/70">~{analysis.metrics.avgSentenceLength} words/sentence</div>
            </div>
          </div>

          {analysis.recommendations.length > 0 && (
            <div className="text-xs text-[#9AA6B7] space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <ChevronRight className="h-3 w-3 text-[#42D9F5]" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Dual Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Textarea */}
        <div className="flex flex-col bg-[#121822]/40 border border-[#283242] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#9AA6B7] uppercase flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#42D9F5]" />
              Source Manuscript / Draft
            </span>
            <span className="text-[11px] font-mono text-[#9AA6B7]/70">
              {inputText.length.toLocaleString()} chars &bull; {inputText.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your research manuscript, LaTeX document, essay draft, or source code comments here..."
            rows={16}
            className="w-full flex-1 bg-[#080B10] border border-[#283242] rounded-md p-3.5 text-xs text-[#F1F4F8] font-mono placeholder:text-slate-600 focus:outline-none focus:border-[#42D9F5] leading-relaxed resize-y"
          />

          <div className="flex items-center justify-between mt-3 text-[11px] text-[#9AA6B7]/70">
            <span>Stateless processing &bull; Zero permanent storage</span>
            <button
              type="button"
              onClick={() => setInputText('')}
              className="hover:text-red-400 font-mono transition-colors cursor-pointer"
            >
              Clear Editor
            </button>
          </div>
        </div>

        {/* Right: Output / Results */}
        <div className="flex flex-col bg-[#121822]/40 border border-[#283242] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 p-0.5 bg-[#080B10] border border-[#283242] rounded">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  activeTab === 'editor' ? 'bg-[#171F2B] text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
                }`}
              >
                Refined Document
              </button>
              {result?.bibtexCitations && result.bibtexCitations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('citations')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    activeTab === 'citations' ? 'bg-[#171F2B] text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
                  }`}
                >
                  BibTeX ({result.bibtexCitations.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('disclosure')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  activeTab === 'disclosure' ? 'bg-[#171F2B] text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
                }`}
              >
                Honesty Disclosure
              </button>
            </div>

            {result?.processedText && (
              <button
                type="button"
                onClick={handleCopyProcessed}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-xs font-mono text-[#F1F4F8] transition-colors cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-[#9AA6B7]" />
                    <span>Copy Output</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tab 1: Refined Output */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col">
              <textarea
                readOnly
                value={result ? result.processedText : 'Run refinement to generate cleaned output with preserved mathematical formulas, code blocks, and academic transitions.'}
                rows={16}
                className="w-full flex-1 bg-[#080B10] border border-[#283242] rounded-md p-3.5 text-xs text-[#F1F4F8] font-mono leading-relaxed resize-y focus:outline-none"
              />

              {result && (
                <div className="mt-3 p-3 bg-[#080B10] border border-[#283242] rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">
                      &bull; {result.diffStats.wordsChanged} words altered
                    </span>
                    <span className="text-[#42D9F5]">
                      &bull; {result.diffStats.zonesPreserved} protected zones intact
                    </span>
                    <span className="text-[#9AA6B7]">
                      &bull; {result.processingTimeMs}ms execution
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9AA6B7]/70">
                    Flesch: {result.metricsBefore.fleschKincaidReadingEase} &rarr; {result.metricsAfter.fleschKincaidReadingEase}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: BibTeX Drawer */}
          {activeTab === 'citations' && result && (
            <div className="flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#9AA6B7]">
                  {result.bibtexCitations.length} Citations Injected into Manuscript:
                </span>
                <Button variant="secondary" size="sm" onClick={handleCopyAllBibtex} className="text-xs font-mono">
                  {copiedBibtex ? 'Copied BibTeX Package!' : 'Copy All BibTeX'}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px]">
                {result.bibtexCitations.map((b, idx) => (
                  <div key={idx} className="p-3 bg-[#080B10] border border-[#283242] rounded space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-[#42D9F5]">
                      <span>\\cite&#123;{b.citationKey}&#125;</span>
                      <span className="text-[10px] text-[#9AA6B7]">{b.year}</span>
                    </div>
                    <div className="text-[#F1F4F8] font-sans font-medium text-xs">{b.title}</div>
                    <div className="text-[11px] text-[#9AA6B7] font-sans">{b.authors.join(', ')}</div>
                    <pre className="text-[10px] text-slate-400 bg-[#121822] p-2 rounded overflow-x-auto whitespace-pre">
                      {b.bibtexString}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Scientific Honesty Disclosure */}
          {activeTab === 'disclosure' && (
            <div className="flex-1 p-4 bg-[#080B10] border border-[#283242] rounded text-xs space-y-3 font-sans">
              <h4 className="font-semibold text-[#F1F4F8] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#42D9F5]" />
                Evidence-Based Scientific Integrity Disclosure
              </h4>
              <p className="text-[#9AA6B7] leading-relaxed">
                Turnitout was engineered to eliminate machine artifacts and repetitive AI cliches from drafts while strictly preserving LaTeX equations, code syntax, and academic formatting.
              </p>
              <div className="p-3 bg-[#121822] border border-[#283242] rounded space-y-2">
                <div className="font-mono text-[11px] text-[#42D9F5]">Research Grounding (Stanford & Maryland):</div>
                <p className="text-[11px] text-[#9AA6B7] leading-relaxed">
                  Per research by Liang et al. (Stanford University, 2023) and Sadasivan et al. (University of Maryland, 2023), statistical AI detectors suffer from high false-positive rates on non-native speakers and continually modify proprietary server-side heuristics.
                </p>
                <p className="text-[11px] text-[#9AA6B7] leading-relaxed">
                  Therefore, AI Heaven will never claim 100% detection bypass or watermark removal without verifiable cryptographic proof. We guarantee deterministic in-place mathematical preservation, code integrity, and zero third-party data retention.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
