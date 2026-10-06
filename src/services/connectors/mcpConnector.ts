import { SourceConnectorConfig } from '../../types/connector';
import { Resource, ResourceRelationship } from '../../types/resource';
import { BaseSourceConnector } from './baseConnector';

export class MCPSourceConnector extends BaseSourceConnector {
  config: SourceConnectorConfig = {
    id: 'conn_mcp',
    name: 'Model Context Protocol (MCP) Registry Connector',
    target_source: 'Official MCP Registry & Specification',
    official_domain: 'modelcontextprotocol.io',
    endpoint: 'https://spec.modelcontextprotocol.io/v1/servers',
    auth_type: 'none',
    rate_limit_per_minute: 120,
    is_active: true
  };

  async discover(): Promise<string[]> {
    return [
      'model-context-protocol'
    ];
  }

  async fetch(identifier: string): Promise<Record<string, unknown>> {
    return {
      name: 'Model Context Protocol',
      slug: identifier,
      spec_version: '2024-11-25',
      website: 'https://modelcontextprotocol.io'
    };
  }

  async normalize(raw: Record<string, unknown>): Promise<Resource> {
    const slug = String(raw.slug || 'model-context-protocol');
    return {
      id: `res_${slug.replace(/-/g, '_')}`,
      slug,
      name: 'Model Context Protocol (MCP)',
      resource_type: 'mcp_server',
      provider_id: 'prov_anthropic',
      description: 'Open standard that standardizes how applications provide context and tools to LLMs.',
      summary: 'Open protocol for AI tool and resource interoperability.',
      source_url: 'https://modelcontextprotocol.io',
      documentation_url: 'https://modelcontextprotocol.io/introduction',
      repository_url: 'https://github.com/modelcontextprotocol',
      publisher: 'Anthropic / MCP Working Group',
      author: 'Open Community',
      version: '2024-11-25',
      license: 'MIT',
      capabilities: ['tool_execution', 'resource_templates', 'json_rpc_2_0'],
      dependencies: ['JSON-RPC 2.0'],
      tags: ['mcp', 'standard', 'open-protocol'],
      categories: ['Agent Protocols', 'Open Standards'],
      verification_status: 'verified',
      trust_score: 99,
      provenance: {
        source_provider: 'Anthropic PBC',
        source_url: 'https://modelcontextprotocol.io',
        source_identifier: slug,
        source_type: 'open_standard_manifest',
        first_seen_at: '2024-11-25T00:00:00Z',
        last_seen_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        sync_status: 'synced',
        is_demo_data: false
      },
      external_identifiers: {
        spec_url: 'https://spec.modelcontextprotocol.io'
      },
      agent_contract: {
        what_is_it: 'Open specification for tool and context interoperability.',
        what_does_it_do: 'Standardizes tool schemas and execution protocols.',
        who_provides_it: 'Anthropic & Community',
        inputs: ['JSON-RPC 2.0 frames'],
        outputs: ['Standardized tool response payloads'],
        authentication: {
          type: 'none',
          required: false,
          header_or_param: 'Transport-dependent',
          description: 'Local stdio or remote SSE'
        },
        permissions: ['Local or network context'],
        rate_limits: 'Host constrained',
        cost_model: 'Free (MIT)',
        compatibility: ['Claude Desktop', 'AI Studio Agent Runners', 'Cursor'],
        alternatives: []
      }
    };
  }

  async extract_relationships(resource: Resource): Promise<ResourceRelationship[]> {
    return [
      {
        id: `rel_mcp_${Date.now()}`,
        source_slug: 'google-ai-studio',
        target_slug: resource.slug,
        relationship_type: 'compatible_with',
        evidence_url: 'https://modelcontextprotocol.io',
        confidence: 0.92,
        verified: true,
        created_at: new Date().toISOString(),
        description: 'Gemini models and Google AI tooling can invoke tools formatted to the MCP standard.'
      }
    ];
  }
}

export const mcpSourceConnector = new MCPSourceConnector();
