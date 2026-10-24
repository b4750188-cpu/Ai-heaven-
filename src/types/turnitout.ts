/**
 * AI HEAVEN - Turnitout Document Processing & Academic Writing Engine Types
 * 
 * Provides types for:
 * 1. Document cleanup & academic writing refinement
 * 2. LaTeX math and code syntax zone protection
 * 3. Multi-language code comment and docstring parsing
 * 4. Academic discipline taxonomy & BibTeX reference generation
 * 5. Lexical metrics, readability scoring, and honest capability disclosures
 */

export type TurnitoutMode =
  | 'academic_refine'
  | 'clarity'
  | 'code_comments'
  | 'citation_inject';

export type AcademicDiscipline =
  | 'computer_science'
  | 'engineering_physics'
  | 'mathematics_statistics'
  | 'quantitative_finance'
  | 'medical_life_sciences';

export type ProtectedZoneType =
  | 'latex_math_inline'
  | 'latex_math_block'
  | 'latex_env'
  | 'latex_macro'
  | 'code_block'
  | 'inline_code'
  | 'markdown_header'
  | 'markdown_link'
  | 'citation_key';

export interface ProtectedZone {
  id: string;
  type: ProtectedZoneType;
  placeholder: string;
  original: string;
  startIndex: number;
  endIndex: number;
}

export interface DocumentMetrics {
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  fleschKincaidReadingEase: number;
  clicheMatches: number;
  protectedZonesCount: number;
  citationsGenerated: number;
}

export interface BibTeXEntry {
  citationKey: string;
  title: string;
  authors: string[];
  year: number;
  journalOrConference: string;
  doi?: string;
  bibtexString: string;
}

export interface TurnitoutProcessOptions {
  mode: TurnitoutMode;
  intensity?: number; // 1 (mild) to 5 (rigorous), default 2
  discipline?: AcademicDiscipline;
  preserveLatex?: boolean; // default true
  preserveCode?: boolean; // default true
  codeLanguage?: string; // e.g. 'python', 'typescript', 'java', 'cpp', 'rust'
  citationStyle?: 'bibtex' | 'ieee' | 'apa';
  maxCitations?: number;
}

export interface TurnitoutProcessResult {
  success: boolean;
  originalText: string;
  processedText: string;
  mode: TurnitoutMode;
  discipline: AcademicDiscipline;
  intensity: number;
  protectedZones: ProtectedZone[];
  diffStats: {
    wordsChanged: number;
    phrasesReplaced: number;
    zonesPreserved: number;
  };
  metricsBefore: DocumentMetrics;
  metricsAfter: DocumentMetrics;
  bibtexCitations: BibTeXEntry[];
  disclaimer: string;
  processingTimeMs: number;
  timestamp: string;
  error?: string;
}

export interface TurnitoutAnalysisResult {
  metrics: DocumentMetrics;
  detectedDiscipline?: AcademicDiscipline;
  detectedZones: {
    latexZones: number;
    codeBlocks: number;
    markdownElements: number;
  };
  clicheOccurrences: Array<{ phrase: string; count: number; suggestedReplacements: string[] }>;
  recommendations: string[];
}

export interface TurnitoutStatus {
  isAvailable: boolean;
  version: string;
  architecture: 'clean_room_typescript';
  licenseNotice: string;
  privacyGuarantee: string;
  supportedFormats: string[];
  supportedLanguages: string[];
  scientificHonestyDisclosure: string;
}
