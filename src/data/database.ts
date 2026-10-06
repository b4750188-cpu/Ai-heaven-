/**
 * AI HEAVEN AUTHORITATIVE DATA STORE
 * Strictly grounded in official provider documentation and open standards.
 * Every record enforces provenance, verification audit, and explicit is_demo_data flags.
 */

import { Provider, Resource, ResourceRelationship } from '../types/resource';

export const PROVIDERS: Provider[] = [
  {
    id: 'prov_google',
    slug: 'google',
    name: 'Google',
    legal_name: 'Google LLC',
    website_url: 'https://about.google',
    documentation_url: 'https://ai.google.dev',
    headquarters: 'Mountain View, CA, USA',
    description: 'Multinational technology company pioneering artificial intelligence research, developer platforms, and foundational Gemini models.',
    resource_types_provided: ['platform', 'model', 'api', 'sdk', 'tool', 'dataset', 'compute'],
    verified: true,
    external_identifiers: {
      wikidata: 'Q95',
      domain: 'google.com',
      stock_ticker: 'NASDAQ:GOOGL'
    }
  },
  {
    id: 'prov_anthropic',
    slug: 'anthropic',
    name: 'Anthropic',
    legal_name: 'Anthropic PBC',
    website_url: 'https://anthropic.com',
    documentation_url: 'https://docs.anthropic.com',
    headquarters: 'San Francisco, CA, USA',
    description: 'AI safety and research company developing Claude models, constitutional AI, and open standards including Model Context Protocol (MCP).',
    resource_types_provided: ['model', 'api', 'sdk', 'mcp_server'],
    verified: true,
    external_identifiers: {
      domain: 'anthropic.com'
    }
  },
  {
    id: 'prov_openai',
    slug: 'openai',
    name: 'OpenAI',
    legal_name: 'OpenAI OpCo, LLC',
    website_url: 'https://openai.com',
    documentation_url: 'https://platform.openai.com/docs',
    headquarters: 'San Francisco, CA, USA',
    description: 'AI research and deployment company developing GPT-4o, reasoning models, and developer platform APIs.',
    resource_types_provided: ['model', 'api', 'sdk', 'platform'],
    verified: true,
    external_identifiers: {
      domain: 'openai.com'
    }
  },
  {
    id: 'prov_meta',
    slug: 'meta',
    name: 'Meta',
    legal_name: 'Meta Platforms, Inc.',
    website_url: 'https://ai.meta.com',
    documentation_url: 'https://ai.meta.com/llama',
    headquarters: 'Menlo Park, CA, USA',
    description: 'Open AI ecosystem contributor releasing open-weight foundation models including the Llama family and research toolkits.',
    resource_types_provided: ['model', 'repository', 'dataset'],
    verified: true,
    external_identifiers: {
      stock_ticker: 'NASDAQ:META'
    }
  },
  {
    id: 'prov_github',
    slug: 'github',
    name: 'GitHub',
    legal_name: 'GitHub, Inc. (Microsoft)',
    website_url: 'https://github.com',
    documentation_url: 'https://docs.github.com',
    headquarters: 'San Francisco, CA, USA',
    description: 'Developer platform hosting open source AI codebases, SDK repositories, MCP servers, and cookbook implementations.',
    resource_types_provided: ['repository', 'platform', 'tool'],
    verified: true,
    external_identifiers: {
      domain: 'github.com'
    }
  },
  {
    id: 'prov_huggingface',
    slug: 'huggingface',
    name: 'Hugging Face',
    legal_name: 'Hugging Face, Inc.',
    website_url: 'https://huggingface.co',
    documentation_url: 'https://huggingface.co/docs',
    headquarters: 'New York, NY, USA',
    description: 'Open platform and community hosting AI models, datasets, benchmarks, and model cards across the global AI research ecosystem.',
    resource_types_provided: ['platform', 'model', 'dataset', 'tool'],
    verified: true,
    external_identifiers: {
      domain: 'huggingface.co'
    }
  }
];

export const RESOURCES: Resource[] = [
  // 1. GOOGLE AI STUDIO (Primary Resource)
  {
    id: 'res_google_ai_studio',
    slug: 'google-ai-studio',
    name: 'Google AI Studio',
    resource_type: 'platform',
    provider_id: 'prov_google',
    description: 'Web-based prototyping environment and developer platform for rapidly building with Google Gemini models, generating API keys, testing system instructions, and exporting production-ready code in Python, TypeScript/JavaScript, cURL, and Swift.',
    summary: 'Developer platform & rapid prototyping IDE for Gemini models and the Gemini API.',
    source_url: 'https://aistudio.google.com',
    documentation_url: 'https://ai.google.dev/gemini-api/docs',
    repository_url: 'https://github.com/google-gemini',
    publisher: 'Google LLC',
    author: 'Google AI / DeepMind',
    version: '2026.1-production',
    license: 'Proprietary developer service (Free tier & Pay-as-you-go via Google Cloud Project)',
    capabilities: [
      'multimodal_prompting',
      'system_instructions',
      'temperature_tuning',
      'structured_json_output',
      'function_calling_testing',
      'code_execution_sandbox',
      'context_caching_management',
      'search_grounding_toggle',
      'multi_turn_chat_prototyping',
      'code_export_python_ts_curl',
      'api_key_management'
    ],
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf', 'code'],
      output: ['text', 'code', 'structured_json']
    },
    context_limit: 2000000,
    dependencies: [
      'Gemini API',
      'Google Cloud Project (for pay-as-you-go tier)',
      'Web Browser (W3C Standard)'
    ],
    tags: [
      'developer-platform',
      'prototyping',
      'gemini',
      'multimodal',
      'api-keys',
      'code-generation',
      'playground'
    ],
    categories: ['Developer Tools', 'AI Platforms', 'Model Playgrounds'],
    verification_status: 'verified',
    trust_score: 98,
    provenance: {
      source_provider: 'Google LLC',
      source_url: 'https://ai.google.dev',
      source_identifier: 'google-ai-studio',
      source_type: 'official_documentation',
      first_seen_at: '2023-12-13T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      canonical_url: 'https://aistudio.google.com',
      docs_portal: 'https://ai.google.dev',
      github_org: 'https://github.com/google-gemini'
    },
    agent_contract: {
      what_is_it: 'A browser-based developer console and testing workbench provided by Google to interact with Gemini foundation models, experiment with prompt engineering, configure generation parameters, and generate API keys.',
      what_does_it_do: 'Enables developers and autonomous agents to test multimodal queries across text, audio, video, image, and code; generate executable SDK snippets; provision Gemini API keys; and inspect model token usage.',
      who_provides_it: 'Google DeepMind & Google AI (Google LLC)',
      inputs: [
        'Text prompts & System instructions',
        'Image files (JPEG, PNG, WebP, HEIC)',
        'Audio files (WAV, MP3, AAC, FLAC)',
        'Video files (MP4, MPEG, MOV, AVI)',
        'Document files (PDFs up to 1000 pages)'
      ],
      outputs: [
        'Generated text completions',
        'Structured JSON schemas',
        'Executable code blocks (Python, JS, cURL)',
        'Function call payloads & schema responses',
        'API keys and project credentials'
      ],
      authentication: {
        type: 'oauth2',
        required: true,
        header_or_param: 'Google Account Sign-In / GCP OAuth',
        description: 'Requires a standard Google account. Once authenticated, users can generate long-lived GEMINI_API_KEY tokens for server and script use.'
      },
      permissions: [
        'aiplatform.endpoints.predict',
        'cloudresourcemanager.projects.get (optional for billing)'
      ],
      rate_limits: 'Free tier: up to 15 RPM / 1 million TPM depending on model. Paid tier: scales up to 1000+ RPM via Google Cloud billing.',
      cost_model: 'Free tier available with rate limits (prompts may be used to train models). Paid tier billed per token with zero data training.',
      compatibility: [
        'Web Standards browsers',
        'Node.js 18+',
        'Python 3.9+',
        'cURL 7.0+',
        'Google Cloud Console'
      ],
      alternatives: [
        'OpenAI Developer Platform',
        'Anthropic Console (Workbench)',
        'Hugging Face Inference Playground'
      ]
    },
    models: [
      {
        model_id: 'gemini-1.5-pro-002',
        display_name: 'Gemini 1.5 Pro',
        version: '002',
        release_date: '2024-09-24',
        context_window_tokens: 2097152,
        input_modalities: ['text', 'image', 'audio', 'video', 'pdf'],
        output_modalities: ['text', 'code'],
        supports_function_calling: true,
        supports_code_execution: true,
        supports_structured_output: true,
        supports_search_grounding: true,
        supports_context_caching: true,
        pricing_input_per_million: '$3.50 (<=128k) / $7.00 (>128k)',
        pricing_output_per_million: '$10.50 (<=128k) / $21.00 (>128k)',
        official_endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
        documentation_url: 'https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-pro'
      },
      {
        model_id: 'gemini-1.5-flash-002',
        display_name: 'Gemini 1.5 Flash',
        version: '002',
        release_date: '2024-09-24',
        context_window_tokens: 1048576,
        input_modalities: ['text', 'image', 'audio', 'video', 'pdf'],
        output_modalities: ['text', 'code'],
        supports_function_calling: true,
        supports_code_execution: true,
        supports_structured_output: true,
        supports_search_grounding: true,
        supports_context_caching: true,
        pricing_input_per_million: '$0.075 (<=128k) / $0.15 (>128k)',
        pricing_output_per_million: '$0.30 (<=128k) / $0.60 (>128k)',
        official_endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        documentation_url: 'https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-flash'
      },
      {
        model_id: 'gemini-2.0-flash',
        display_name: 'Gemini 2.0 Flash',
        version: 'Experimental / GA',
        release_date: '2024-12-11',
        context_window_tokens: 1048576,
        input_modalities: ['text', 'image', 'audio', 'video'],
        output_modalities: ['text', 'code'],
        supports_function_calling: true,
        supports_code_execution: true,
        supports_structured_output: true,
        supports_search_grounding: true,
        supports_context_caching: true,
        pricing_input_per_million: '$0.10',
        pricing_output_per_million: '$0.40',
        official_endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        documentation_url: 'https://ai.google.dev/gemini-api/docs/models/gemini#gemini-2.0-flash'
      }
    ],
    supported_workflows: [
      'Prompt prototyping and iterative refinement',
      'System prompt hardening and safety threshold adjustment',
      'Tool / Function definition schema generation and testing',
      'Exporting working code templates to GitHub / VS Code',
      'API Key generation and scoped permission review',
      'Multimodal document parsing and evaluation'
    ]
  },

  // 2. GEMINI API (Resource)
  {
    id: 'res_gemini_api',
    slug: 'gemini-api',
    name: 'Gemini API',
    resource_type: 'api',
    provider_id: 'prov_google',
    description: 'RESTful and gRPC API interface enabling direct programmatic access to Gemini models for multimodal generation, streaming responses, tool calls, and semantic embeddings.',
    summary: 'Programmatic REST/gRPC API for integrating Gemini models into autonomous agents and software.',
    source_url: 'https://generativelanguage.googleapis.com',
    documentation_url: 'https://ai.google.dev/api',
    repository_url: 'https://github.com/googleapis/google-api-python-client',
    publisher: 'Google LLC',
    author: 'Google AI',
    version: 'v1beta',
    license: 'Google APIs Terms of Service',
    capabilities: [
      'generateContent',
      'streamGenerateContent',
      'countTokens',
      'embedContent',
      'batchEmbedContents',
      'cachedContents_CRUD',
      'tunedModels_CRUD'
    ],
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text', 'application/json']
    },
    context_limit: 2097152,
    dependencies: ['HTTPS/TLS 1.3', 'HTTP/2 or gRPC transport'],
    tags: ['api', 'rest', 'grpc', 'gemini', 'streaming', 'embeddings'],
    categories: ['APIs', 'Developer Tools'],
    verification_status: 'verified',
    trust_score: 99,
    provenance: {
      source_provider: 'Google LLC',
      source_url: 'https://ai.google.dev/api',
      source_identifier: 'generativelanguage.googleapis.com',
      source_type: 'official_api',
      first_seen_at: '2023-12-13T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      api_hostname: 'generativelanguage.googleapis.com',
      vertex_equivalent: 'aiplatform.googleapis.com'
    },
    agent_contract: {
      what_is_it: 'Google\'s official HTTP REST and RPC gateway for sending prompts and receiving multimodal inference results.',
      what_does_it_do: 'Accepts structured JSON payloads containing contents, system instructions, safety settings, and tool declarations, and streams back tokens or executes function calls.',
      who_provides_it: 'Google LLC',
      inputs: ['Content blocks with parts: text, inline_data, file_data'],
      outputs: ['Candidates array with content parts and finish_reason'],
      authentication: {
        type: 'api_key',
        required: true,
        header_or_param: 'x-goog-api-key header or ?key= query parameter',
        description: 'Supplied as an HTTP header x-goog-api-key or Authorization: Bearer OAuth token.'
      },
      permissions: ['read/write generation requests'],
      rate_limits: 'Varies by tier and model (15 RPM free, up to 1000+ RPM paid)',
      cost_model: 'Token-based billing per million input/output characters or tokens',
      compatibility: ['All HTTP/1.1 and HTTP/2 clients', 'curl', 'Fetch API', 'gRPC'],
      alternatives: ['OpenAI Chat Completions API', 'Anthropic Messages API']
    }
  },

  // 3. GOOGLE GENAI SDK (SDK)
  {
    id: 'res_google_genai_sdk',
    slug: 'google-genai-sdk',
    name: 'Google GenAI SDK (@google/genai)',
    resource_type: 'sdk',
    provider_id: 'prov_google',
    description: 'Unified official developer SDK across Python and TypeScript for connecting to both Gemini Developer API (AI Studio) and Google Cloud Vertex AI using consistent syntax.',
    summary: 'Official multi-language client library for Gemini Developer API and Vertex AI.',
    source_url: 'https://github.com/googleapis/python-genai',
    documentation_url: 'https://googleapis.github.io/python-genai/',
    repository_url: 'https://github.com/googleapis/python-genai',
    publisher: 'Google LLC',
    author: 'Google Cloud & Google AI Teams',
    version: '2.4.0',
    license: 'Apache-2.0',
    capabilities: [
      'client.models.generate_content',
      'client.models.generate_content_stream',
      'automatic_function_calling',
      'async_support',
      'vertex_ai_mode_switch'
    ],
    dependencies: ['Node.js >= 18' , 'Python >= 3.9'],
    tags: ['sdk', 'typescript', 'python', 'npm', 'pypi', 'open-source'],
    categories: ['SDKs', 'Developer Tools'],
    verification_status: 'verified',
    trust_score: 97,
    provenance: {
      source_provider: 'Google LLC',
      source_url: 'https://github.com/googleapis/python-genai',
      source_identifier: '@google/genai',
      source_type: 'verified_git_repository',
      first_seen_at: '2024-11-01T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      npm_package: '@google/genai',
      pypi_package: 'google-genai'
    },
    agent_contract: {
      what_is_it: 'The standard TypeScript and Python programmatic library for building autonomous agents with Gemini.',
      what_does_it_do: 'Marshals JSON types, encapsulates HTTP retries, unpacks streaming chunks, and executes tool handlers.',
      who_provides_it: 'Google LLC',
      inputs: ['SDK parameters and typing constructs'],
      outputs: ['Typed GenerateContentResponse objects'],
      authentication: {
        type: 'api_key',
        required: true,
        header_or_param: 'GEMINI_API_KEY environment variable',
        description: 'Picks up GEMINI_API_KEY from environment automatically or via GoogleGenAI({apiKey: "..."}).'
      },
      permissions: ['Network egress to googleapis.com'],
      rate_limits: 'Bound by API key limits',
      cost_model: 'Free open source library; underlying API usage charged per standard model rates',
      compatibility: ['Node 18+', 'Browser (bundled)', 'Python 3.9+'],
      alternatives: ['openai-node', '@anthropic-ai/sdk']
    }
  },

  // 4. GEMINI 1.5 PRO (Model)
  {
    id: 'res_gemini_1_5_pro',
    slug: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    resource_type: 'model',
    provider_id: 'prov_google',
    description: 'Flagship mid-size multimodal model built for complex reasoning across up to 2 million tokens of context, enabling full repository analysis, hours of video understanding, and multi-book cross-examination.',
    summary: '2M context window multimodal reasoning foundation model.',
    source_url: 'https://deepmind.google/technologies/gemini/pro/',
    documentation_url: 'https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-pro',
    repository_url: null,
    publisher: 'Google DeepMind',
    author: 'Gemini Team',
    version: '002',
    license: 'Proprietary foundation model weights accessed via API',
    capabilities: [
      '2m_context_window',
      'multimodal_audio_video_pdf',
      'complex_reasoning',
      'in_context_learning',
      'code_analysis',
      'function_calling'
    ],
    modalities: {
      input: ['text', 'code', 'image', 'audio', 'video', 'pdf'],
      output: ['text', 'code']
    },
    context_limit: 2097152,
    dependencies: ['Gemini API or Google AI Studio'],
    tags: ['model', 'multimodal', 'long-context', 'flagship', 'reasoning'],
    categories: ['AI Models', 'Foundation Models'],
    verification_status: 'verified',
    trust_score: 98,
    provenance: {
      source_provider: 'Google DeepMind',
      source_url: 'https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-pro',
      source_identifier: 'gemini-1.5-pro-002',
      source_type: 'official_documentation',
      first_seen_at: '2024-02-15T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      model_id: 'gemini-1.5-pro-002',
      vertex_model_id: 'gemini-1.5-pro-002'
    },
    agent_contract: {
      what_is_it: 'Google\'s high-capacity multimodal foundation model optimized for broad knowledge, code reasoning, and large-corpus comprehension.',
      what_does_it_do: 'Processes massive context (up to 2,097,152 tokens) and delivers structured outputs, reasoning trees, and precise citations.',
      who_provides_it: 'Google DeepMind',
      inputs: ['Multimodal tokens'],
      outputs: ['Generated text and JSON responses'],
      authentication: {
        type: 'api_key',
        required: true,
        header_or_param: 'GEMINI_API_KEY',
        description: 'Accessed via Gemini API endpoint.'
      },
      permissions: ['API key with model invocation quota'],
      rate_limits: 'Standard: 2 RPM (free), 360 RPM (paid Tier 1)',
      cost_model: '$3.50/M input tokens, $10.50/M output tokens (<=128k prompt)',
      compatibility: ['Gemini API', 'Vertex AI', 'Google AI Studio'],
      alternatives: ['claude-3-5-sonnet', 'gpt-4o']
    }
  },

  // 5. ANTHROPIC CLAUDE 3.5 SONNET (Model)
  {
    id: 'res_claude_3_5_sonnet',
    slug: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    resource_type: 'model',
    provider_id: 'prov_anthropic',
    description: 'Anthropic\'s industry-leading coding and reasoning model with 200k token context, artifact generation capabilities, and computer use beta.',
    summary: 'High-intelligence reasoning and coding model by Anthropic.',
    source_url: 'https://www.anthropic.com/news/claude-3-5-sonnet',
    documentation_url: 'https://docs.anthropic.com/en/docs/about-claude/models',
    repository_url: null,
    publisher: 'Anthropic PBC',
    author: 'Anthropic Research',
    version: '20241022',
    license: 'Proprietary model via API',
    capabilities: [
      'coding_excellence',
      'computer_use',
      'vision_understanding',
      'prompt_caching',
      'tool_use'
    ],
    modalities: {
      input: ['text', 'image'],
      output: ['text', 'code']
    },
    context_limit: 200000,
    dependencies: ['Anthropic Messages API'],
    tags: ['model', 'coding', 'reasoning', 'vision', 'anthropic'],
    categories: ['AI Models', 'Foundation Models'],
    verification_status: 'verified',
    trust_score: 98,
    provenance: {
      source_provider: 'Anthropic PBC',
      source_url: 'https://docs.anthropic.com',
      source_identifier: 'claude-3-5-sonnet-20241022',
      source_type: 'official_documentation',
      first_seen_at: '2024-06-20T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      model_id: 'claude-3-5-sonnet-20241022'
    },
    agent_contract: {
      what_is_it: 'Anthropic\'s flagship model balancing intelligence and speed for software engineering and complex reasoning.',
      what_does_it_do: 'Generates verified code, plans architectures, parses UI screenshots, and produces structured tool invocations.',
      who_provides_it: 'Anthropic PBC',
      inputs: ['Text and image tokens'],
      outputs: ['Text and tool invocation calls'],
      authentication: {
        type: 'api_key',
        required: true,
        header_or_param: 'x-api-key header',
        description: 'Requires an Anthropic API key.'
      },
      permissions: ['Standard model inference'],
      rate_limits: 'Tiered based on deposit balance (50 - 4000 RPM)',
      cost_model: '$3.00/M input tokens, $15.00/M output tokens',
      compatibility: ['Anthropic API', 'AWS Bedrock', 'Google Cloud Vertex AI'],
      alternatives: ['gemini-1-5-pro', 'gpt-4o']
    }
  },

  // 6. OPENAI GPT-4o (Model)
  {
    id: 'res_gpt_4o',
    slug: 'gpt-4o',
    name: 'GPT-4o',
    resource_type: 'model',
    provider_id: 'prov_openai',
    description: 'Omni-modal foundation model by OpenAI natively trained across audio, vision, and text with 128k context and high-speed token generation.',
    summary: 'Omni foundation model supporting text, vision, and audio.',
    source_url: 'https://openai.com/index/hello-gpt-4o/',
    documentation_url: 'https://platform.openai.com/docs/models/gpt-4o',
    repository_url: null,
    publisher: 'OpenAI OpCo, LLC',
    author: 'OpenAI Team',
    version: '2024-11-20',
    license: 'Proprietary model via API',
    capabilities: [
      'omni_audio_vision',
      'structured_outputs',
      'function_calling',
      'realtime_api'
    ],
    modalities: {
      input: ['text', 'image', 'audio'],
      output: ['text', 'audio']
    },
    context_limit: 128000,
    dependencies: ['OpenAI API'],
    tags: ['model', 'omni', 'vision', 'audio', 'openai'],
    categories: ['AI Models', 'Foundation Models'],
    verification_status: 'verified',
    trust_score: 97,
    provenance: {
      source_provider: 'OpenAI OpCo, LLC',
      source_url: 'https://platform.openai.com/docs',
      source_identifier: 'gpt-4o',
      source_type: 'official_documentation',
      first_seen_at: '2024-05-13T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      model_id: 'gpt-4o'
    },
    agent_contract: {
      what_is_it: 'OpenAI\'s flagship multimodal model designed for conversational speed and reasoning.',
      what_does_it_do: 'Analyzes visual diagrams, transcribes audio, writes software, and responds with low latency.',
      who_provides_it: 'OpenAI OpCo, LLC',
      inputs: ['Text, images, audio'],
      outputs: ['Text, audio, structured tool calls'],
      authentication: {
        type: 'api_key',
        required: true,
        header_or_param: 'Authorization: Bearer OPENAI_API_KEY',
        description: 'Requires an OpenAI API key.'
      },
      permissions: ['Standard endpoint permission'],
      rate_limits: 'Tiered by billing tier (500 - 10,000 RPM)',
      cost_model: '$2.50/M input tokens, $10.00/M output tokens',
      compatibility: ['OpenAI API', 'Azure OpenAI Service'],
      alternatives: ['gemini-1-5-pro', 'claude-3-5-sonnet']
    }
  },

  // 7. MODEL CONTEXT PROTOCOL (Open Standard / Platform)
  {
    id: 'res_model_context_protocol',
    slug: 'model-context-protocol',
    name: 'Model Context Protocol (MCP)',
    resource_type: 'mcp_server',
    provider_id: 'prov_anthropic',
    description: 'Open standard published by Anthropic that standardizes how AI applications and autonomous agents connect to external tools, data repositories, and secure execution environments.',
    summary: 'Universal open protocol for AI agent tool and resource connectivity.',
    source_url: 'https://modelcontextprotocol.io',
    documentation_url: 'https://modelcontextprotocol.io/introduction',
    repository_url: 'https://github.com/modelcontextprotocol',
    publisher: 'Anthropic PBC / Open Community',
    author: 'Anthropic Developer Experience',
    version: '2024-11-25',
    license: 'MIT License',
    capabilities: [
      'standardized_tool_schemas',
      'resource_discovery',
      'prompt_templates',
      'stdio_transport',
      'sse_http_transport',
      'client_server_separation'
    ],
    dependencies: ['JSON-RPC 2.0', 'TypeScript SDK or Python SDK'],
    tags: ['mcp', 'standard', 'open-source', 'tools', 'interoperability', 'agents'],
    categories: ['Agent Protocols', 'Developer Tools', 'Open Standards'],
    verification_status: 'verified',
    trust_score: 99,
    provenance: {
      source_provider: 'Anthropic PBC',
      source_url: 'https://modelcontextprotocol.io',
      source_identifier: 'mcp-specification',
      source_type: 'open_standard_manifest',
      first_seen_at: '2024-11-25T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      github_org: 'https://github.com/modelcontextprotocol',
      spec_url: 'https://spec.modelcontextprotocol.io'
    },
    agent_contract: {
      what_is_it: 'An open protocol that provides a universal language for agents to discover tools, query live data, and read contextual system state.',
      what_does_it_do: 'Replaces bespoke API wrappers with typed JSON-RPC server interfaces for databases, filesystems, Git, and web search.',
      who_provides_it: 'Anthropic & Open Source Community',
      inputs: ['JSON-RPC 2.0 requests over stdio or SSE'],
      outputs: ['Structured tool results, contents, and error codes'],
      authentication: {
        type: 'none',
        required: false,
        header_or_param: 'Local stdio pipe or Bearer token over SSE',
        description: 'Protocol-level authentication depends on transport (local process or HTTPS bearer).'
      },
      permissions: ['Sandboxed process execution'],
      rate_limits: 'Local execution bound by host hardware',
      cost_model: 'Free open source protocol (MIT)',
      compatibility: ['Claude Desktop', 'AI Studio Agent Runners', 'Cursor', 'LangChain', 'LlamaIndex'],
      alternatives: ['Custom Function Calling schemas', 'OpenAI Assistants API Tools']
    }
  },

  // 8. GOOGLE GEMINI COOKBOOK (GitHub Repository)
  {
    id: 'res_google_gemini_cookbook',
    slug: 'google-gemini-cookbook',
    name: 'Google Gemini Cookbook',
    resource_type: 'repository',
    provider_id: 'prov_github',
    description: 'Official Google repository of code examples, architectural guides, and Jupyter notebooks demonstrating agent workflows, multimodal processing, function calling, and search grounding with Gemini.',
    summary: 'Official Google repository of guides and code recipes for the Gemini API.',
    source_url: 'https://github.com/google-gemini/cookbook',
    documentation_url: 'https://github.com/google-gemini/cookbook/blob/main/README.md',
    repository_url: 'https://github.com/google-gemini/cookbook',
    publisher: 'Google LLC',
    author: 'Google Developer Relations',
    version: 'main',
    license: 'Apache-2.0',
    capabilities: [
      'code_samples',
      'agent_recipes',
      'multimodal_guides',
      'search_grounding_tutorials',
      'fine_tuning_examples'
    ],
    dependencies: ['Python 3.10+', 'Jupyter Notebooks', 'google-genai'],
    tags: ['github', 'cookbook', 'tutorials', 'open-source', 'gemini'],
    categories: ['GitHub Repositories', 'Developer Tools', 'Documentation'],
    verification_status: 'verified',
    trust_score: 96,
    provenance: {
      source_provider: 'GitHub / Google',
      source_url: 'https://github.com/google-gemini/cookbook',
      source_identifier: 'google-gemini/cookbook',
      source_type: 'verified_git_repository',
      first_seen_at: '2023-12-15T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      github_full_name: 'google-gemini/cookbook'
    },
    agent_contract: {
      what_is_it: 'A curated collection of open-source recipes for building with Gemini.',
      what_does_it_do: 'Provides drop-in reference implementations for code execution, RAG, and agent orchestration.',
      who_provides_it: 'Google LLC',
      inputs: ['Repository clone / raw HTTP file fetches'],
      outputs: ['Executable Python source and markdown instructions'],
      authentication: {
        type: 'none',
        required: false,
        header_or_param: 'Public GitHub Repo',
        description: 'Public open-source repository.'
      },
      permissions: ['Public read access'],
      rate_limits: 'GitHub API unauthenticated 60 req/hr; cloned repo unlimited',
      cost_model: 'Free (Apache-2.0)',
      compatibility: ['Python 3.9+', 'Google Colab', 'Jupyter Lab'],
      alternatives: ['openai-cookbook', 'anthropic-cookbook']
    }
  },

  // 9. META LLAMA 3.3 70B (Model)
  {
    id: 'res_llama_3_3_70b',
    slug: 'llama-3-3-70b',
    name: 'Llama 3.3 70B Instruct',
    resource_type: 'model',
    provider_id: 'prov_meta',
    description: 'State-of-the-art open-weight model by Meta delivering performance competitive with previous 405B parameters at significantly lower compute requirements with 128k context support.',
    summary: 'Flagship 70B open-weights foundation model by Meta.',
    source_url: 'https://ai.meta.com/blog/llama-3-3/',
    documentation_url: 'https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_3/',
    repository_url: 'https://github.com/meta-llama/llama3',
    publisher: 'Meta Platforms, Inc.',
    author: 'Meta AI',
    version: '3.3-70B-Instruct',
    license: 'Llama 3.3 Community License Agreement',
    capabilities: [
      'open_weights',
      'local_deployment',
      'instruction_tuning',
      'tool_calling',
      'fine_tuning_friendly'
    ],
    modalities: {
      input: ['text'],
      output: ['text', 'code']
    },
    context_limit: 131072,
    dependencies: ['vLLM, Ollama, Hugging Face TGI, or cloud inference API'],
    tags: ['model', 'open-weights', 'meta', 'llama', 'self-hosted'],
    categories: ['AI Models', 'Open Source'],
    verification_status: 'verified',
    trust_score: 95,
    provenance: {
      source_provider: 'Meta AI',
      source_url: 'https://ai.meta.com/blog/llama-3-3/',
      source_identifier: 'meta-llama/Llama-3.3-70B-Instruct',
      source_type: 'official_documentation',
      first_seen_at: '2024-12-06T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      huggingface_repo: 'meta-llama/Llama-3.3-70B-Instruct'
    },
    agent_contract: {
      what_is_it: 'Open-weights dense transformer model suitable for on-premise execution or self-hosted cloud clusters.',
      what_does_it_do: 'Processes instructions, performs multi-step reasoning, and runs without vendor lock-in.',
      who_provides_it: 'Meta Platforms, Inc.',
      inputs: ['Tokenized text'],
      outputs: ['Generated text completion'],
      authentication: {
        type: 'none',
        required: false,
        header_or_param: 'Local weights execution or host authorization token',
        description: 'Free to run locally once downloaded via approved Hugging Face account.'
      },
      permissions: ['Host GPU compute permissions'],
      rate_limits: 'Determined by private infrastructure throughput',
      cost_model: 'Free weights (license applies for >700M monthly active users)',
      compatibility: ['PyTorch', 'vLLM', 'Ollama', 'TGI'],
      alternatives: ['gemini-1-5-flash', 'gpt-4o-mini']
    }
  },

  // 10. HUGGING FACE HUB (Platform)
  {
    id: 'res_huggingface_hub',
    slug: 'huggingface-hub',
    name: 'Hugging Face Hub',
    resource_type: 'platform',
    provider_id: 'prov_huggingface',
    description: 'Central collaborative registry hosting over 1 million open-source AI models, datasets, and Spaces demos across PyTorch, TensorFlow, and ONNX.',
    summary: 'The universal open repository and ecosystem for machine learning artifacts.',
    source_url: 'https://huggingface.co',
    documentation_url: 'https://huggingface.co/docs/hub/index',
    repository_url: 'https://github.com/huggingface/huggingface_hub',
    publisher: 'Hugging Face, Inc.',
    author: 'Hugging Face Open Source Team',
    version: 'Hub v2.0',
    license: 'Platform Terms & Open Source Git LFS',
    capabilities: [
      'git_lfs_model_storage',
      'dataset_viewer',
      'model_cards_metadata',
      'inference_endpoints',
      'webhooks_and_spaces'
    ],
    dependencies: ['Git LFS', 'Python huggingface_hub package'],
    tags: ['platform', 'registry', 'models', 'datasets', 'open-source'],
    categories: ['AI Platforms', 'Model Registries'],
    verification_status: 'verified',
    trust_score: 98,
    provenance: {
      source_provider: 'Hugging Face, Inc.',
      source_url: 'https://huggingface.co',
      source_identifier: 'huggingface-hub',
      source_type: 'official_documentation',
      first_seen_at: '2020-01-01T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'synced',
      is_demo_data: false
    },
    external_identifiers: {
      domain: 'huggingface.co'
    },
    agent_contract: {
      what_is_it: 'A Git-based registry for downloading model weights, reading model cards, and querying dataset schemas.',
      what_does_it_do: 'Allows programmatic discovery and streaming download of tensor weights and safetensors.',
      who_provides_it: 'Hugging Face, Inc.',
      inputs: ['Repository paths, commit hashes, or model identifiers'],
      outputs: ['Git LFS artifacts, safetensors files, JSON metadata'],
      authentication: {
        type: 'token',
        required: false,
        header_or_param: 'Authorization: Bearer HF_TOKEN (for gated models)',
        description: 'Public models require no token; gated models require HF user token.'
      },
      permissions: ['Read model artifacts'],
      rate_limits: 'Generous public limits',
      cost_model: 'Free for open source hosting; paid for private storage and dedicated inference',
      compatibility: ['Transformers', 'Diffusers', 'LangChain', 'LlamaIndex'],
      alternatives: ['Civitai', 'Ollama Model Library']
    }
  },

  // 11. CLEARLY MARKED DEMO RECORD (For demonstrating the demo data disclosure rule)
  {
    id: 'res_demo_experimental_agent',
    slug: 'demo-sandbox-agent',
    name: 'Experimental Sandbox Agent (Demo Prototype)',
    resource_type: 'agent_framework',
    provider_id: 'prov_github',
    description: 'An unverified prototype agent runner constructed in a staging sandbox. Clearly designated to demonstrate AI Heaven\'s strict separation of verified production data versus demo records.',
    summary: 'Staging prototype record illustrating AI Heaven provenance disclosure.',
    source_url: 'https://example.com/demo-sandbox',
    documentation_url: 'https://example.com/demo-sandbox/docs',
    repository_url: null,
    publisher: 'Community Contributor (Staging)',
    author: 'Sandbox Tester',
    version: '0.0.1-demo',
    license: 'MIT',
    capabilities: ['simulated_tool_execution'],
    dependencies: ['Local sandbox'],
    tags: ['demo-data', 'staging', 'experimental'],
    categories: ['Agent Protocols'],
    verification_status: 'unverified',
    trust_score: 35,
    provenance: {
      source_provider: 'Community Staging Sandbox',
      source_url: 'https://example.com/demo-sandbox',
      source_identifier: 'demo-sandbox-01',
      source_type: 'open_standard_manifest',
      first_seen_at: '2026-09-20T00:00:00Z',
      last_seen_at: '2026-09-25T11:00:00Z',
      last_verified_at: '2026-09-25T11:00:00Z',
      sync_status: 'pending',
      is_demo_data: true // Explicitly marked DEMO DATA!
    },
    external_identifiers: {
      sandbox_id: 'stage-992'
    },
    agent_contract: {
      what_is_it: 'A non-production demo resource for testing verification filtering.',
      what_does_it_do: 'Illustrates how unverified entries display warning banners and lower trust scores.',
      who_provides_it: 'Staging Test Harness',
      inputs: ['Mock inputs'],
      outputs: ['Mock outputs'],
      authentication: {
        type: 'none',
        required: false,
        header_or_param: 'None',
        description: 'Demo only'
      },
      permissions: ['None'],
      rate_limits: 'N/A',
      cost_model: 'Free',
      compatibility: ['Experimental'],
      alternatives: ['None']
    }
  }
];

export const RELATIONSHIPS: ResourceRelationship[] = [
  // Google AI Studio -> Gemini Models
  {
    id: 'rel_01',
    source_slug: 'google-ai-studio',
    target_slug: 'gemini-1-5-pro',
    relationship_type: 'provides',
    evidence_url: 'https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-pro',
    confidence: 1.0,
    verified: true,
    created_at: '2024-02-15T00:00:00Z',
    description: 'Google AI Studio provides a browser-based testing canvas and configuration environment for Gemini 1.5 Pro.'
  },
  {
    id: 'rel_02',
    source_slug: 'google-ai-studio',
    target_slug: 'gemini-api',
    relationship_type: 'provides',
    evidence_url: 'https://ai.google.dev/gemini-api/docs',
    confidence: 1.0,
    verified: true,
    created_at: '2023-12-13T00:00:00Z',
    description: 'Google AI Studio provisions, monitors, and issues official API keys for the Gemini API.'
  },
  {
    id: 'rel_03',
    source_slug: 'google-genai-sdk',
    target_slug: 'gemini-api',
    relationship_type: 'accesses',
    evidence_url: 'https://github.com/googleapis/python-genai',
    confidence: 1.0,
    verified: true,
    created_at: '2024-11-01T00:00:00Z',
    description: 'The official @google/genai SDK acts as the programmatic client library connecting to the Gemini API.'
  },
  {
    id: 'rel_04',
    source_slug: 'google-ai-studio',
    target_slug: 'google-gemini-cookbook',
    relationship_type: 'integrates_with',
    evidence_url: 'https://github.com/google-gemini/cookbook',
    confidence: 0.98,
    verified: true,
    created_at: '2024-01-10T00:00:00Z',
    description: 'Code snippets generated in Google AI Studio align directly with the patterns and dependencies in Google Gemini Cookbook.'
  },
  {
    id: 'rel_05',
    source_slug: 'gemini-1-5-pro',
    target_slug: 'claude-3-5-sonnet',
    relationship_type: 'alternative_to',
    evidence_url: 'https://deepmind.google/technologies/gemini/pro/',
    confidence: 0.95,
    verified: true,
    created_at: '2024-06-25T00:00:00Z',
    description: 'Gemini 1.5 Pro and Claude 3.5 Sonnet serve as alternative leading reasoning and coding foundation models in the frontier class.'
  },
  {
    id: 'rel_06',
    source_slug: 'gemini-1-5-pro',
    target_slug: 'gpt-4o',
    relationship_type: 'alternative_to',
    evidence_url: 'https://ai.google.dev',
    confidence: 0.95,
    verified: true,
    created_at: '2024-05-20T00:00:00Z',
    description: 'Gemini 1.5 Pro and OpenAI GPT-4o offer alternative multimodal text, image, and audio inference solutions.'
  },
  {
    id: 'rel_07',
    source_slug: 'gemini-1-5-pro',
    target_slug: 'llama-3-3-70b',
    relationship_type: 'alternative_to',
    evidence_url: 'https://ai.meta.com/blog/llama-3-3/',
    confidence: 0.92,
    verified: true,
    created_at: '2024-12-07T00:00:00Z',
    description: 'Llama 3.3 70B serves as an open-weights self-hostable alternative to proprietary cloud models like Gemini 1.5 Pro.'
  },
  {
    id: 'rel_08',
    source_slug: 'google-ai-studio',
    target_slug: 'model-context-protocol',
    relationship_type: 'compatible_with',
    evidence_url: 'https://modelcontextprotocol.io',
    confidence: 0.92,
    verified: true,
    created_at: '2024-12-01T00:00:00Z',
    description: 'Gemini models invoked via AI Studio tool call schemas can be connected to Model Context Protocol (MCP) server endpoints.'
  },
  {
    id: 'rel_09',
    source_slug: 'huggingface-hub',
    target_slug: 'llama-3-3-70b',
    relationship_type: 'publishes',
    evidence_url: 'https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct',
    confidence: 1.0,
    verified: true,
    created_at: '2024-12-06T00:00:00Z',
    description: 'Hugging Face Hub hosts the official safetensors repository and model card for Meta Llama 3.3 70B Instruct.'
  }
];
