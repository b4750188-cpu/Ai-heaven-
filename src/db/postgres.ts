/**
 * AI HEAVEN - PostgreSQL Database Client & Migration Manager
 * Provides serverless-compatible connection pooling, automatic schema migrations,
 * health diagnostics, and persistence for tasks, workers, approvals, and audit trails.
 */

import pg from 'pg';

const { Pool } = pg;

export interface DbHealthStatus {
  configured: boolean;
  connected: boolean;
  latencyMs?: number;
  scheme?: string;
  host?: string;
  port?: string;
  database?: string;
  error?: string;
  tables_initialized?: boolean;
}

class PostgresManager {
  private pool: pg.Pool | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  public isConfigured(): boolean {
    const url = process.env.DATABASE_URL;
    return Boolean(url && url.trim().length > 0);
  }

  public getRedactedConfig() {
    const url = process.env.DATABASE_URL;
    if (!url || !url.trim()) {
      return { configured: false, status: 'UNCONFIGURED' };
    }
    try {
      const parsed = new URL(url);
      return {
        configured: true,
        status: 'CONFIGURED',
        scheme: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parsed.port || '5432',
        database: parsed.pathname.replace('/', '') || 'postgres'
      };
    } catch {
      return { configured: false, status: 'INVALID_URI' };
    }
  }

  public getPool(): pg.Pool | null {
    if (!this.isConfigured()) return null;
    if (!this.pool) {
      const connectionString = process.env.DATABASE_URL!;
      const isRemote = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

      this.pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined
      });

      this.pool.on('error', (err) => {
        console.error('[PostgreSQL Pool Error]:', err.message);
      });
    }
    return this.pool;
  }

  public async checkHealth(): Promise<DbHealthStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'DATABASE_URL environment variable is not configured.'
      };
    }

    const config = this.getRedactedConfig();
    const start = Date.now();
    try {
      const pool = this.getPool();
      if (!pool) throw new Error('Failed to instantiate connection pool');
      const client = await pool.connect();
      try {
        await client.query('SELECT 1 AS health_check');
        const latencyMs = Date.now() - start;
        return {
          configured: true,
          connected: true,
          latencyMs,
          scheme: config.scheme,
          host: config.host,
          port: config.port,
          database: config.database,
          tables_initialized: this.isInitialized
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        scheme: config.scheme,
        host: config.host,
        port: config.port,
        database: config.database,
        error: `Database connection failed: ${err.message}`
      };
    }
  }

  public async ensureMigrations(): Promise<void> {
    if (!this.isConfigured()) return;
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const pool = this.getPool();
      if (!pool) return;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Projects table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_projects (
            id VARCHAR(128) PRIMARY KEY,
            owner_id VARCHAR(128) NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            status VARCHAR(64) DEFAULT 'active',
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 2. Workspaces table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_workspaces (
            id VARCHAR(128) PRIMARY KEY,
            project_id VARCHAR(128) NOT NULL,
            owner_id VARCHAR(128) NOT NULL,
            name VARCHAR(256) NOT NULL,
            filesystem_ref VARCHAR(512),
            status VARCHAR(64) DEFAULT 'ready',
            environment_variables JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 3. Workers table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_workers (
            id VARCHAR(128) PRIMARY KEY,
            agent_id VARCHAR(128) NOT NULL,
            state VARCHAR(64) NOT NULL,
            health VARCHAR(64) NOT NULL,
            current_task_id VARCHAR(128),
            current_execution_id VARCHAR(128),
            is_paused BOOLEAN DEFAULT FALSE,
            is_cancelled BOOLEAN DEFAULT FALSE,
            heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
            last_activity_at TIMESTAMPTZ DEFAULT NOW(),
            registered_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 4. Tasks table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_tasks (
            id VARCHAR(128) PRIMARY KEY,
            idempotency_key VARCHAR(128) UNIQUE,
            correlation_id VARCHAR(128),
            owner_id VARCHAR(128) NOT NULL,
            project_id VARCHAR(128) NOT NULL,
            workspace_id VARCHAR(128) NOT NULL,
            agent_id VARCHAR(128) NOT NULL,
            goal TEXT NOT NULL,
            status VARCHAR(64) NOT NULL,
            priority VARCHAR(32) NOT NULL,
            plan JSONB NOT NULL,
            current_action_index INTEGER DEFAULT 0,
            receipt JSONB,
            failure_reason TEXT,
            cancellation_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ
          );
        `);

        // 5. Approvals table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_approvals (
            id VARCHAR(128) PRIMARY KEY,
            execution_id VARCHAR(128) NOT NULL,
            project_id VARCHAR(128) NOT NULL,
            workspace_id VARCHAR(128) NOT NULL,
            agent_id VARCHAR(128) NOT NULL,
            command TEXT NOT NULL,
            command_fingerprint VARCHAR(128) NOT NULL,
            requested_by_actor VARCHAR(32) NOT NULL,
            decided_by_user_id VARCHAR(128),
            status VARCHAR(32) NOT NULL,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            decided_at TIMESTAMPTZ
          );
        `);

        // 6. Audit Events table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_audit_events (
            id VARCHAR(128) PRIMARY KEY,
            correlation_id VARCHAR(128),
            event_type VARCHAR(64) NOT NULL,
            actor_id VARCHAR(128) NOT NULL,
            actor_type VARCHAR(32) NOT NULL,
            project_id VARCHAR(128),
            workspace_id VARCHAR(128),
            action VARCHAR(128) NOT NULL,
            status VARCHAR(32) NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            error_message TEXT,
            resource VARCHAR(256),
            result TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 7. Kill switch status table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_kill_switch (
            id VARCHAR(32) PRIMARY KEY,
            is_active BOOLEAN NOT NULL DEFAULT FALSE,
            scope VARCHAR(32),
            target_id VARCHAR(128),
            triggered_by VARCHAR(128),
            triggered_at TIMESTAMPTZ,
            reason TEXT
          );
        `);

        // 8. Execution Jobs table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_execution_jobs (
            id VARCHAR(128) PRIMARY KEY,
            agent_id VARCHAR(128) NOT NULL,
            project_id VARCHAR(128) NOT NULL,
            workspace_id VARCHAR(128) NOT NULL,
            tool_id VARCHAR(128) NOT NULL,
            command TEXT NOT NULL,
            state VARCHAR(32) NOT NULL,
            is_destructive BOOLEAN DEFAULT FALSE,
            requires_approval BOOLEAN DEFAULT FALSE,
            approval_id VARCHAR(128),
            stdout TEXT,
            stderr TEXT,
            exit_code INTEGER,
            duration_ms INTEGER,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 9. Engineering Memories table (Continuity Engine)
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_engineering_memories (
            id VARCHAR(128) PRIMARY KEY,
            tenant_id VARCHAR(128) NOT NULL,
            project_id VARCHAR(128),
            project_name VARCHAR(256),
            title VARCHAR(256) NOT NULL,
            domain VARCHAR(64) NOT NULL,
            category VARCHAR(64) NOT NULL,
            content TEXT NOT NULL,
            tags JSONB DEFAULT '[]'::jsonb,
            evidence_status VARCHAR(32) NOT NULL,
            confidence_score REAL NOT NULL,
            source_type VARCHAR(64) NOT NULL,
            source_reference VARCHAR(256) NOT NULL,
            is_global_approved BOOLEAN DEFAULT FALSE,
            evidence_payload JSONB DEFAULT '{}'::jsonb,
            influencing_tasks JSONB DEFAULT '[]'::jsonb,
            update_history JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 10. Task Outcomes table (Measurable Telemetry)
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_task_outcomes (
            id VARCHAR(128) PRIMARY KEY,
            task_id VARCHAR(128) NOT NULL,
            project_id VARCHAR(128) NOT NULL,
            model_used VARCHAR(128) NOT NULL,
            duration_ms INTEGER NOT NULL,
            tests_total INTEGER DEFAULT 0,
            tests_passed INTEGER DEFAULT 0,
            tests_failed INTEGER DEFAULT 0,
            reliability_score REAL DEFAULT 1.0,
            tokens_used INTEGER DEFAULT 0,
            cost_estimate REAL DEFAULT 0.0,
            cost_source VARCHAR(64) DEFAULT 'catalog_estimated',
            regressions_detected INTEGER DEFAULT 0,
            resumed_from_checkpoint VARCHAR(128),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 11. Autonomous Bug Hunt Campaigns table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_bughunt_jobs (
            id VARCHAR(128) PRIMARY KEY,
            user_id VARCHAR(128) NOT NULL,
            tenant_id VARCHAR(128) NOT NULL,
            title VARCHAR(256) NOT NULL,
            target VARCHAR(512) NOT NULL,
            status VARCHAR(64) NOT NULL,
            progress_percent INTEGER DEFAULT 0,
            current_droid VARCHAR(128),
            scope_snapshot_checksum VARCHAR(128),
            cancellation_reason TEXT,
            resumed_from_phase VARCHAR(64),
            config JSONB NOT NULL,
            logs JSONB DEFAULT '[]'::jsonb,
            report_markdown TEXT,
            started_at TIMESTAMPTZ DEFAULT NOW(),
            completed_at TIMESTAMPTZ
          );
        `);

        // 12. Vulnerability Findings table
        await client.query(`
          CREATE TABLE IF NOT EXISTS aiheaven_vulnerability_findings (
            id VARCHAR(128) PRIMARY KEY,
            hunt_id VARCHAR(128) NOT NULL,
            user_id VARCHAR(128) NOT NULL,
            tenant_id VARCHAR(128) NOT NULL,
            title VARCHAR(256) NOT NULL,
            cwe_id VARCHAR(32) NOT NULL,
            cwe_name VARCHAR(256) NOT NULL,
            cvss_score REAL NOT NULL,
            cvss_vector VARCHAR(128) NOT NULL,
            severity VARCHAR(32) NOT NULL,
            category VARCHAR(64) NOT NULL,
            target_url TEXT NOT NULL,
            affected_component VARCHAR(256) NOT NULL,
            description TEXT NOT NULL,
            reproduction_steps JSONB DEFAULT '[]'::jsonb,
            curl_command TEXT NOT NULL,
            raw_request TEXT NOT NULL,
            raw_response TEXT NOT NULL,
            evidence_hash VARCHAR(128) NOT NULL,
            verification_status VARCHAR(64) NOT NULL,
            verified_by_droid_id VARCHAR(128) NOT NULL,
            false_positive_review_notes TEXT,
            is_data_redacted BOOLEAN DEFAULT TRUE,
            remediation TEXT NOT NULL,
            discovered_at TIMESTAMPTZ DEFAULT NOW(),
            verified_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Create indexes for query speed
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_tasks_agent_proj ON aiheaven_tasks(agent_id, project_id);
          CREATE INDEX IF NOT EXISTS idx_tasks_status ON aiheaven_tasks(status);
          CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON aiheaven_audit_events(timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_approvals_status ON aiheaven_approvals(status);
          CREATE INDEX IF NOT EXISTS idx_jobs_state ON aiheaven_execution_jobs(state);
          CREATE INDEX IF NOT EXISTS idx_memories_tenant_proj ON aiheaven_engineering_memories(tenant_id, project_id);
          CREATE INDEX IF NOT EXISTS idx_memories_status ON aiheaven_engineering_memories(evidence_status);
          CREATE INDEX IF NOT EXISTS idx_outcomes_proj_task ON aiheaven_task_outcomes(project_id, task_id);
          CREATE INDEX IF NOT EXISTS idx_bughunt_tenant_user ON aiheaven_bughunt_jobs(tenant_id, user_id);
          CREATE INDEX IF NOT EXISTS idx_findings_tenant_user ON aiheaven_vulnerability_findings(tenant_id, user_id);
          CREATE INDEX IF NOT EXISTS idx_findings_status ON aiheaven_vulnerability_findings(verification_status);
        `);

        await client.query('COMMIT');
        this.isInitialized = true;
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[PostgreSQL Migration Error]:', err.message);
        throw err;
      } finally {
        client.release();
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  // --- Safe Helper Query Methods for Serverless Persistence ---

  public async saveTask(task: any): Promise<void> {
    if (!this.isConfigured()) return;
    const pool = this.getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO aiheaven_tasks 
        (id, idempotency_key, correlation_id, owner_id, project_id, workspace_id, agent_id, goal, status, priority, plan, current_action_index, receipt, failure_reason, cancellation_reason, created_at, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET 
         status = EXCLUDED.status, 
         plan = EXCLUDED.plan,
         current_action_index = EXCLUDED.current_action_index,
         receipt = EXCLUDED.receipt,
         failure_reason = EXCLUDED.failure_reason,
         cancellation_reason = EXCLUDED.cancellation_reason,
         started_at = EXCLUDED.started_at,
         completed_at = EXCLUDED.completed_at`,
      [
        task.id,
        task.idempotency_key || null,
        task.correlation_id || null,
        task.owner_id,
        task.project_id,
        task.workspace_id,
        task.agent_id,
        task.goal,
        task.status,
        task.priority,
        JSON.stringify(task.plan),
        task.current_action_index || 0,
        task.receipt ? JSON.stringify(task.receipt) : null,
        task.failure_reason || null,
        task.cancellation_reason || null,
        task.created_at || new Date().toISOString(),
        task.started_at || null,
        task.completed_at || null
      ]
    );
  }

  public async getTasks(agentId?: string): Promise<any[]> {
    if (!this.isConfigured()) return [];
    const pool = this.getPool();
    if (!pool) return [];
    let query = 'SELECT * FROM aiheaven_tasks';
    const params: any[] = [];
    if (agentId) {
      query += ' WHERE agent_id = $1';
      params.push(agentId);
    }
    query += ' ORDER BY created_at ASC';
    const res = await pool.query(query, params);
    return res.rows.map(row => ({
      ...row,
      plan: typeof row.plan === 'string' ? JSON.parse(row.plan) : row.plan,
      receipt: typeof row.receipt === 'string' ? JSON.parse(row.receipt) : row.receipt
    }));
  }

  public async saveWorker(worker: any): Promise<void> {
    if (!this.isConfigured()) return;
    const pool = this.getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO aiheaven_workers
        (id, agent_id, state, health, current_task_id, current_execution_id, is_paused, is_cancelled, heartbeat_at, last_activity_at, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         state = EXCLUDED.state,
         health = EXCLUDED.health,
         current_task_id = EXCLUDED.current_task_id,
         current_execution_id = EXCLUDED.current_execution_id,
         is_paused = EXCLUDED.is_paused,
         is_cancelled = EXCLUDED.is_cancelled,
         heartbeat_at = EXCLUDED.heartbeat_at,
         last_activity_at = EXCLUDED.last_activity_at`,
      [
        worker.id || `worker_${worker.agent_id}`,
        worker.agent_id,
        worker.state,
        worker.health,
        worker.current_task_id || null,
        worker.current_execution_id || null,
        Boolean(worker.is_paused),
        Boolean(worker.is_cancelled),
        worker.heartbeat_at || new Date().toISOString(),
        worker.last_activity_at || new Date().toISOString(),
        worker.registered_at || new Date().toISOString()
      ]
    );
  }

  public async getWorkers(): Promise<any[]> {
    if (!this.isConfigured()) return [];
    const pool = this.getPool();
    if (!pool) return [];
    const res = await pool.query('SELECT * FROM aiheaven_workers ORDER BY registered_at ASC');
    return res.rows;
  }

  public async saveApproval(approval: any): Promise<void> {
    if (!this.isConfigured()) return;
    const pool = this.getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO aiheaven_approvals
        (id, execution_id, project_id, workspace_id, agent_id, command, command_fingerprint, requested_by_actor, decided_by_user_id, status, rejection_reason, created_at, expires_at, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         decided_by_user_id = EXCLUDED.decided_by_user_id,
         rejection_reason = EXCLUDED.rejection_reason,
         decided_at = EXCLUDED.decided_at`,
      [
        approval.id,
        approval.execution_id,
        approval.project_id,
        approval.workspace_id,
        approval.agent_id,
        approval.command,
        approval.command_fingerprint,
        approval.requested_by_actor,
        approval.decided_by_user_id || null,
        approval.status,
        approval.rejection_reason || null,
        approval.created_at,
        approval.expires_at,
        approval.decided_at || null
      ]
    );
  }

  public async getApprovals(status?: string): Promise<any[]> {
    if (!this.isConfigured()) return [];
    const pool = this.getPool();
    if (!pool) return [];
    let query = 'SELECT * FROM aiheaven_approvals';
    const params: any[] = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    return res.rows;
  }

  public async saveKillSwitch(status: any): Promise<void> {
    if (!this.isConfigured()) return;
    const pool = this.getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO aiheaven_kill_switch
        (id, is_active, scope, target_id, triggered_by, triggered_at, reason)
       VALUES ('global', $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         scope = EXCLUDED.scope,
         target_id = EXCLUDED.target_id,
         triggered_by = EXCLUDED.triggered_by,
         triggered_at = EXCLUDED.triggered_at,
         reason = EXCLUDED.reason`,
      [
        Boolean(status.is_active),
        status.scope || 'global',
        status.target_id || null,
        status.triggered_by || null,
        status.triggered_at || null,
        status.reason || null
      ]
    );
  }

  public async getKillSwitch(): Promise<any | null> {
    if (!this.isConfigured()) return null;
    const pool = this.getPool();
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM aiheaven_kill_switch WHERE id = $1', ['global']);
    return res.rows[0] || null;
  }

  // --- Continuity Engine Helper Queries ---

  public async saveEngineeringMemory(memory: any): Promise<void> {
    if (!this.isConfigured()) return;
    const pool = this.getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO aiheaven_engineering_memories
        (id, tenant_id, project_id, project_name, title, domain, category, content, tags, evidence_status, confidence_score, source_type, source_reference, is_global_approved, evidence_payload, influencing_tasks, update_history, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         tags = EXCLUDED.tags,
         evidence_status = EXCLUDED.evidence_status,
         confidence_score = EXCLUDED.confidence_score,
         is_global_approved = EXCLUDED.is_global_approved,
         evidence_payload = EXCLUDED.evidence_payload,
         influencing_tasks = EXCLUDED.influencing_tasks,
         update_history = EXCLUDED.update_history,
         updated_at = NOW()`,
      [
        memory.id,
        memory.tenantId,
        memory.projectId || null,
        memory.projectName || null,
        memory.title,
        memory.domain,
        memory.category,
        memory.content,
        JSON.stringify(memory.tags || []),
        memory.evidenceStatus,
        memory.confidenceScore,
        memory.sourceType,
        memory.sourceReference,
        Boolean(memory.isGlobalApproved),
        JSON.stringify(memory.evidencePayload || {}),
        JSON.stringify(memory.influencingTasks || []),
        JSON.stringify(memory.updateHistory || []),
        memory.createdAt || new Date().toISOString(),
        memory.updatedAt || new Date().toISOString()
      ]
    );
  }

  public async getEngineeringMemories(tenantId: string, projectId?: string | null, includeGlobal = true): Promise<any[]> {
    if (!this.isConfigured()) return [];
    const pool = this.getPool();
    if (!pool) return [];

    let query = 'SELECT * FROM aiheaven_engineering_memories WHERE (tenant_id = $1';
    const params: any[] = [tenantId];

    if (projectId) {
      params.push(projectId);
      query += ` AND project_id = $${params.length}`;
    }

    query += ')';

    if (includeGlobal) {
      query += ' OR (is_global_approved = TRUE AND project_id IS NULL)';
    }

    query += ' ORDER BY created_at DESC';

    const res = await pool.query(query, params);
    return res.rows.map(row => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      evidencePayload: typeof row.evidence_payload === 'string' ? JSON.parse(row.evidence_payload) : row.evidence_payload,
      influencingTasks: typeof row.influencing_tasks === 'string' ? JSON.parse(row.influencing_tasks) : row.influencing_tasks,
      updateHistory: typeof row.update_history === 'string' ? JSON.parse(row.update_history) : row.update_history
    }));
  }

  public async deleteEngineeringMemory(id: string, tenantId: string): Promise<boolean> {
    if (!this.isConfigured()) return true;
    const pool = this.getPool();
    if (!pool) return false;
    const res = await pool.query('DELETE FROM aiheaven_engineering_memories WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async saveTaskOutcome(outcome: any): Promise<void> {
    if (!this.isConfigured()) return;
    const pool = this.getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO aiheaven_task_outcomes
        (id, task_id, project_id, model_used, duration_ms, tests_total, tests_passed, tests_failed, reliability_score, tokens_used, cost_estimate, cost_source, regressions_detected, resumed_from_checkpoint, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        outcome.id,
        outcome.taskId,
        outcome.projectId,
        outcome.modelUsed,
        outcome.durationMs,
        outcome.testsTotal || 0,
        outcome.testsPassed || 0,
        outcome.testsFailed || 0,
        outcome.reliabilityScore ?? 1.0,
        outcome.tokensUsed || 0,
        outcome.costEstimate || 0.0,
        outcome.costSource || 'catalog_estimated',
        outcome.regressionsDetected || 0,
        outcome.resumedFromCheckpoint || null,
        outcome.timestamp || new Date().toISOString()
      ]
    );
  }

  public async getTaskOutcomes(projectId?: string, modelUsed?: string): Promise<any[]> {
    if (!this.isConfigured()) return [];
    const pool = this.getPool();
    if (!pool) return [];
    let query = 'SELECT * FROM aiheaven_task_outcomes';
    const params: any[] = [];
    const where: string[] = [];
    if (projectId) {
      params.push(projectId);
      where.push(`project_id = $${params.length}`);
    }
    if (modelUsed) {
      params.push(modelUsed);
      where.push(`model_used = $${params.length}`);
    }
    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    return res.rows;
  }
}

export const postgresManager = new PostgresManager();
