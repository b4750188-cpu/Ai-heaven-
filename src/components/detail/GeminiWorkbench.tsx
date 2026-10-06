import { Check, Code, Copy, Cpu, Sparkles, Terminal } from 'lucide-react';
import React, { useState } from 'react';

interface GeminiWorkbenchProps {
  onNavigateDoc?: (url: string) => void;
}

export const GeminiWorkbench: React.FC<GeminiWorkbenchProps> = () => {
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro-002');
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are a high-precision autonomous software architect. Return verified, structured JSON analysis.'
  );
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [useCodeExecution, setUseCodeExecution] = useState<boolean>(false);
  const [useFunctionCalling, setUseFunctionCalling] = useState<boolean>(true);
  const [outputMode, setOutputMode] = useState<'text' | 'json'>('json');
  const [selectedLanguage, setSelectedLanguage] = useState<'typescript' | 'python' | 'curl'>('typescript');
  const [copiedCode, setCopiedCode] = useState(false);

  // Generate real, official @google/genai code snippets based on verified SDK syntax
  const generateSnippet = () => {
    if (selectedLanguage === 'typescript') {
      return `import { GoogleGenAI, Type } from '@google/genai';

// Initialize the unified Google GenAI client
const ai = new GoogleGenAI();

async function run() {
  const response = await ai.models.generateContent({
    model: '${selectedModel}',
    contents: 'Analyze this software architecture repository for dependency vulnerabilities.',
    config: {
      systemInstruction: ${JSON.stringify(systemInstruction)},
      temperature: 0.2,${
        outputMode === 'json'
          ? `
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vulnerabilities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                package: { type: Type.STRING },
                severity: { type: Type.STRING },
                remediation: { type: Type.STRING }
              },
              required: ['package', 'severity', 'remediation']
            }
          }
        },
        required: ['vulnerabilities']
      },`
          : ''
      }${
        useSearchGrounding
          ? `
      tools: [{ googleSearch: {} }],`
          : ''
      }${
        useCodeExecution
          ? `
      tools: [{ codeExecution: {} }],`
          : ''
      }${
        useFunctionCalling && !useSearchGrounding && !useCodeExecution
          ? `
      tools: [{
        functionDeclarations: [{
          name: 'queryResourceDatabase',
          description: 'Fetch verified platform specifications from AI Heaven',
          parameters: {
            type: Type.OBJECT,
            properties: { slug: { type: Type.STRING } },
            required: ['slug']
          }
        }]
      }],`
          : ''
      }
    }
  });

  console.log(response.text);
}

run().catch(console.error);`;
    }

    if (selectedLanguage === 'python') {
      return `from google import genai
from google.genai import types

# Initialize official Google GenAI Python client
client = genai.Client()

response = client.models.generate_content(
    model="${selectedModel}",
    contents="Analyze this software architecture repository for dependency vulnerabilities.",
    config=types.GenerateContentConfig(
        system_instruction="${systemInstruction}",
        temperature=0.2,${
          outputMode === 'json'
            ? `
        response_mime_type="application/json",`
            : ''
        }${
          useSearchGrounding
            ? `
        tools=[types.Tool(google_search=types.GoogleSearch())],`
            : ''
        }${
          useCodeExecution
            ? `
        tools=[types.Tool(code_execution=types.CodeExecution())],`
            : ''
        }
    )
)

print(response.text)`;
    }

    // cURL
    return `curl "https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=$GEMINI_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -X POST \\
  -d '{
    "system_instruction": {
      "parts": [{"text": ${JSON.stringify(systemInstruction)}}]
    },
    "contents": [{
      "parts": [{"text": "Analyze this software architecture repository for dependency vulnerabilities."}]
    }],
    "generationConfig": {
      "temperature": 0.2${outputMode === 'json' ? ',\n      "responseMimeType": "application/json"' : ''}
    }
  }'`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
            <span>GOOGLE DEVELOPER WORKFLOW</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>VERIFIED SDK SPECIFICATION</span>
          </div>
          <h3 className="text-base font-bold text-neutral-100 font-mono mt-0.5">
            Gemini Schema & Code Generation Workbench
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Configure system prompts, tool schemas, and multimodal parameters to generate official <code className="text-neutral-300 font-mono">@google/genai</code> client invocations.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-md font-mono text-xs">
          {(['typescript', 'python', 'curl'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-2.5 py-1 rounded capitalize transition-colors ${
                selectedLanguage === lang
                  ? 'bg-neutral-800 text-emerald-400 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        {/* Model Selector */}
        <div className="space-y-1.5">
          <label className="text-neutral-400 block font-medium">FOUNDATION MODEL</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-neutral-700"
          >
            <option value="gemini-1.5-pro-002">Gemini 1.5 Pro (2M ctx / Reasoning)</option>
            <option value="gemini-1.5-flash-002">Gemini 1.5 Flash (1M ctx / High-speed)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Agentic / Low-latency)</option>
          </select>
        </div>

        {/* Output Mode */}
        <div className="space-y-1.5">
          <label className="text-neutral-400 block font-medium">RESPONSE MIME TYPE</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOutputMode('json')}
              className={`flex-1 p-2 rounded border text-center transition-colors ${
                outputMode === 'json'
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300 font-semibold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              Structured JSON
            </button>
            <button
              type="button"
              onClick={() => setOutputMode('text')}
              className={`flex-1 p-2 rounded border text-center transition-colors ${
                outputMode === 'text'
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300 font-semibold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              Raw Text / Markdown
            </button>
          </div>
        </div>

        {/* Built-in Tool Toggles */}
        <div className="space-y-1.5">
          <label className="text-neutral-400 block font-medium">BUILT-IN TOOLS</label>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 p-2 rounded border border-neutral-800 bg-neutral-950 flex-1 justify-center">
              <input
                type="checkbox"
                checked={useSearchGrounding}
                onChange={(e) => {
                  setUseSearchGrounding(e.target.checked);
                  if (e.target.checked) setUseCodeExecution(false);
                }}
                className="rounded border-neutral-800 text-emerald-500"
              />
              <span>Google Search</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 p-2 rounded border border-neutral-800 bg-neutral-950 flex-1 justify-center">
              <input
                type="checkbox"
                checked={useCodeExecution}
                onChange={(e) => {
                  setUseCodeExecution(e.target.checked);
                  if (e.target.checked) setUseSearchGrounding(false);
                }}
                className="rounded border-neutral-800 text-emerald-500"
              />
              <span>Code Sandbox</span>
            </label>
          </div>
        </div>
      </div>

      {/* System Instruction Input */}
      <div className="space-y-1.5 font-mono text-xs">
        <label className="text-neutral-400 block font-medium">SYSTEM INSTRUCTION</label>
        <textarea
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          rows={2}
          className="w-full rounded border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Generated Code Output Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span>Generated SDK Client Code ({selectedLanguage})</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Snippet'}</span>
          </button>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs overflow-x-auto max-h-96">
          <pre className="text-neutral-300 leading-relaxed">{generateSnippet()}</pre>
        </div>
      </div>
    </div>
  );
};
