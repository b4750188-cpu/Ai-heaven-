/**
 * AI HEAVEN - Turnitout Document Processing & Academic Writing Suite
 * 
 * Verifies:
 * 1. Document cleanup & academic prose refinement (cliche removal, discourse connectives)
 * 2. LaTeX math protection (inline $, display $$, equations, citations, macros)
 * 3. Multi-language code comment isolation (preserves executable syntax 100%)
 * 4. Academic discipline taxonomy & BibTeX reference generation
 * 5. Input boundary safeguards and privacy guarantees (in-memory, no disk persistence)
 * 6. Central Brain classification, routing, and intent dispatch
 * 7. REST API endpoints (/api/research/turnitout/*)
 */

import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { app } from '../src/api/app';
import { turnitoutEngine } from '../src/services/research/turnitoutEngine';
import { centralBrainService } from '../src/services/brain/centralBrainService';

let server: http.Server;
let baseUrl: string;

function request(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 500, body });
        } catch {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('Turnitout Document Processing & Academic Writing Integration Suite', async (t) => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  await t.test('1. Document Cleanup & Cliche Reduction: Eliminates predictable AI patterns', () => {
    const raw = 'In this paper, we delve into the neural architecture. It plays a pivotal role in inference. Furthermore, our empirical benchmark serves as a testament to model accuracy. In conclusion, the system stands as a beacon of progress.';
    const result = turnitoutEngine.processDocument(raw, { mode: 'academic_refine', intensity: 3 });

    assert.strictEqual(result.success, true);
    assert.ok(!result.processedText.includes('delve into'), 'delve into replaced');
    assert.ok(!result.processedText.includes('plays a pivotal role'), 'plays a pivotal role replaced');
    assert.ok(!result.processedText.includes('serves as a testament to'), 'serves as a testament to replaced');
    assert.ok(!result.processedText.includes('beacon of'), 'beacon of replaced');
    assert.ok(result.diffStats.wordsChanged > 0, 'recorded words changed');
    assert.ok(result.metricsAfter.clicheMatches < result.metricsBefore.clicheMatches, 'cliche count reduced');
  });

  await t.test('2. LaTeX Math Protection: In-place preservation of inline and block formulas', () => {
    const latexDoc = `
\\section{Optimization}
We examine the loss landscape where $\\int_0^1 f(x) dx = \\frac{\\pi}{4}$ plays a pivotal role.
\\begin{equation}
\\nabla_\\theta J(\\theta) = \\frac{1}{m} \\sum_{i=1}^m \\nabla_\\theta L(f(x^{(i)}; \\theta), y^{(i)})
\\end{equation}
Moreover, reference \\cite{vaswani2017attention} serves as a testament to self-attention.
$$E = mc^2$$
`;
    const result = turnitoutEngine.processDocument(latexDoc, { mode: 'academic_refine', preserveLatex: true });

    assert.strictEqual(result.success, true);
    // Crucial: math zones must be 100% identical character-for-character
    assert.ok(result.processedText.includes('$\\int_0^1 f(x) dx = \\frac{\\pi}{4}$'), 'inline math preserved identically');
    assert.ok(result.processedText.includes('\\begin{equation}\n\\nabla_\\theta J(\\theta) = \\frac{1}{m} \\sum_{i=1}^m \\nabla_\\theta L(f(x^{(i)}; \\theta), y^{(i)})\n\\end{equation}'), 'equation environment preserved identically');
    assert.ok(result.processedText.includes('$$E = mc^2$$'), 'display math preserved identically');
    assert.ok(result.processedText.includes('\\cite{vaswani2017attention}'), 'citation key preserved identically');
    assert.ok(result.diffStats.zonesPreserved >= 4, 'at least 4 protected zones preserved');
  });

  await t.test('3. Multi-Language Code Comments: Modifies comments while preserving 100% executable syntax', () => {
    const pythonCode = `
# We delve into the matrix multiplication
def compute_loss(y_true, y_pred):
    """This function plays a pivotal role in backprop."""
    diff = y_true - y_pred # calculate difference
    return (diff ** 2).mean()
`;
    const result = turnitoutEngine.processDocument(pythonCode, {
      mode: 'code_comments',
      codeLanguage: 'python',
      intensity: 3
    });

    assert.strictEqual(result.success, true);
    // Comments/docstrings transformed
    assert.ok(!result.processedText.includes('# We delve into'), 'python comment humanized');
    assert.ok(!result.processedText.includes('plays a pivotal role'), 'python docstring humanized');

    // Executable statements must be 100% intact
    assert.ok(result.processedText.includes('def compute_loss(y_true, y_pred):'), 'function signature intact');
    assert.ok(result.processedText.includes('diff = y_true - y_pred'), 'variable assignment intact');
    assert.ok(result.processedText.includes('return (diff ** 2).mean()'), 'return statement intact');
  });

  await t.test('4. Academic Discipline Taxonomy & BibTeX: Generates contextual citations', () => {
    const csText = 'The transformer neural network architecture demonstrates superior convergence across distributed compute clusters.';
    const result = turnitoutEngine.processDocument(csText, {
      mode: 'citation_inject',
      discipline: 'computer_science',
      citationStyle: 'bibtex',
      maxCitations: 2
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.bibtexCitations.length > 0, 'generated BibTeX citations');
    const firstCite = result.bibtexCitations[0];
    assert.ok(firstCite.citationKey, 'has citation key');
    assert.ok(firstCite.bibtexString.includes('@'), 'has valid BibTeX string');
    assert.ok(result.processedText.includes(`\\cite{${firstCite.citationKey}}`), 'inserted citation key into manuscript');
  });

  await t.test('5. Privacy Safeguards & Input Boundary: In-memory only and input length capping', () => {
    const status = turnitoutEngine.getStatus();
    assert.strictEqual(status.isAvailable, true);
    assert.ok(status.privacyGuarantee.includes('Zero permanent storage'));
    assert.ok(status.scientificHonestyDisclosure.includes('Stanford research'));

    // Boundary check: empty input
    const emptyRes = turnitoutEngine.processDocument('', { mode: 'academic_refine' });
    assert.strictEqual(emptyRes.success, false);
    assert.ok(emptyRes.error?.includes('required'));

    // Boundary check: oversized input (> 1MB)
    const hugeText = 'A'.repeat(1_000_001);
    const hugeRes = turnitoutEngine.processDocument(hugeText, { mode: 'academic_refine' });
    assert.strictEqual(hugeRes.success, false);
    assert.ok(hugeRes.error?.includes('exceeds safe limit'));
  });

  await t.test('6. Central Brain Integration: Routes document refinement queries and handles status intent', () => {
    // 1. Classification
    const classification = centralBrainService.classifyRequest('Please humanize this LaTeX paper, fix cliches, and generate BibTeX citations');
    assert.strictEqual(classification.domain, 'document_refinement');
    assert.ok(classification.recommendedModel.id.includes('gemini'));
    assert.ok(classification.rationale.includes('Turnitout'));

    // 2. Intent Dispatch
    const intentRes = centralBrainService.generateSelfAwarenessResponse('What is the Turnitout status?');
    assert.ok(intentRes, 'handles Turnitout intent');
    assert.ok(intentRes.includes('Turnitout Academic Writing & Document Refiner'));
    assert.ok(intentRes.includes('LaTeX Math Zones'));
    assert.ok(intentRes.includes('Scientific Honesty Disclosure'));
  });

  await t.test('7. REST API Endpoints: GET /api/research/turnitout/status and taxonomies', async () => {
    // Status
    const statusRes = await request('/api/research/turnitout/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.architecture, 'clean_room_typescript');
    assert.ok(Array.isArray(statusRes.body.supportedFormats));

    // Taxonomies
    const taxRes = await request('/api/research/turnitout/taxonomies');
    assert.strictEqual(taxRes.status, 200);
    assert.ok(Array.isArray(taxRes.body.taxonomies));
    assert.strictEqual(taxRes.body.taxonomies.length, 5, '5 discipline taxonomies');
  });

  await t.test('8. REST API Endpoints: POST /api/research/turnitout/analyze and process', async () => {
    const text = 'In this paper, we delve into quantum physics where $\\psi = \\alpha |0\\rangle + \\beta |1\\rangle$. It plays a pivotal role in quantum supremacy.';
    
    // Analyze
    const analyzeRes = await request('/api/research/turnitout/analyze', {
      method: 'POST',
      body: { text }
    });
    assert.strictEqual(analyzeRes.status, 200);
    assert.strictEqual(analyzeRes.body.detectedZones.latexZones, 1);
    assert.ok(analyzeRes.body.clicheOccurrences.length >= 2);

    // Process
    const processRes = await request('/api/research/turnitout/process', {
      method: 'POST',
      body: {
        text,
        mode: 'academic_refine',
        intensity: 2,
        preserveLatex: true
      }
    });
    assert.strictEqual(processRes.status, 200);
    assert.strictEqual(processRes.body.success, true);
    assert.ok(processRes.body.processedText.includes('$\\psi = \\alpha |0\\rangle + \\beta |1\\rangle$'));
    assert.ok(!processRes.body.processedText.includes('delve into'));
  });
});
