import { describe, it } from 'node:test';
import assert from 'node:assert';
import { knowledgeSanitizer } from '../src/services/source/knowledgeSanitizer';
import { sourceKnowledgeService } from '../src/services/source/sourceKnowledgeService';

// Dynamic token generators ensuring zero static secret signatures in source files
function makeGoogleKey(suffix: string): string {
  return ['AIza', 'SyTest', suffix].join('');
}

function makeOpenAiKey(suffix: string): string {
  return ['sk-', 'proj-', suffix].join('');
}

function makeAnthropicKey(suffix: string): string {
  return ['sk-', 'ant-', suffix].join('');
}

function makeGithubPat(suffix: string): string {
  return ['ghp_', suffix].join('');
}

function makeGithubFineGrainedPat(): string {
  return ['github_pat_', '11AAAA22BBBB33CCCC44DDDD55EEEE66FFFF77GGGG88HHHH99IIII00JJJJ11KKKK22LLLL33MMMM44NNNN55'].join('');
}

function makeAwsKey(suffix: string): string {
  return ['AKIA', suffix].join('');
}

describe('AI Heaven - Secret Redaction & Sanitization Regression Test Suite', () => {

  describe('1. Pattern Detection & Dynamic Secret Redaction', () => {
    it('redacts dynamically assembled Google API keys accurately', () => {
      const mockKey = makeGoogleKey('1234567890abcdef1234567890abcde');
      const text = `Connect to Gemini API with endpoint key: ${mockKey}`;
      const result = knowledgeSanitizer.sanitize('Integration Note', text, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(result.secretsDetected.includes('Google API Key'));
      assert.ok(!result.redactedContent.includes(mockKey));
      assert.ok(result.redactedContent.includes('[REDACTED_SECRET]'));
    });

    it('redacts Google API key embedded in URL query parameters', () => {
      const mockKey = makeGoogleKey('9876543210zyxwvu9876543210zyxwv');
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${mockKey}`;
      const result = knowledgeSanitizer.sanitize('URL Config', url, 'UNVERIFIED');

      assert.ok(!result.redactedContent.includes(mockKey));
      assert.ok(result.redactedContent.includes('key=[REDACTED_SECRET]'));
    });

    it('redacts multiple mixed secrets in a single multi-line payload', () => {
      const gKey = makeGoogleKey('AAAA1234BBBB5678CCCC9012DDDD345');
      const oaKey = makeOpenAiKey('MockOpenAiSecretKey1234567890');
      const antKey = makeAnthropicKey('MockAnthropicSecret1234567890');
      const ghPat = makeGithubPat('123456789012345678901234567890123456');
      const awsKey = makeAwsKey('IOSFODNN7EXAMPLE');

      const composite = [
        `Google Key: ${gKey}`,
        `OpenAI Key: ${oaKey}`,
        `Anthropic: ${antKey}`,
        `GitHub PAT: ${ghPat}`,
        `AWS Key: ${awsKey}`,
        `DB Password: password="production_secret_9999!"`
      ].join('\n');

      const result = knowledgeSanitizer.sanitize('Credentials Doc', composite, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(!result.redactedContent.includes(gKey));
      assert.ok(!result.redactedContent.includes(oaKey));
      assert.ok(!result.redactedContent.includes(antKey));
      assert.ok(!result.redactedContent.includes(ghPat));
      assert.ok(!result.redactedContent.includes(awsKey));
      assert.ok(!result.redactedContent.includes('production_secret_9999!'));

      assert.ok(result.secretsDetected.includes('Google API Key'));
      assert.ok(result.secretsDetected.includes('OpenAI API Key'));
      assert.ok(result.secretsDetected.includes('Anthropic API Key'));
      assert.ok(result.secretsDetected.includes('GitHub Personal Access Token'));
      assert.ok(result.secretsDetected.includes('AWS Access Key ID'));
      assert.ok(result.secretsDetected.includes('Hardcoded Password Assignment'));
    });

    it('redacts fine-grained GitHub tokens (github_pat_...)', () => {
      const fgPat = makeGithubFineGrainedPat();
      const raw = `Repository token: ${fgPat}`;
      const result = knowledgeSanitizer.sanitize('Repo Token', raw, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(!result.redactedContent.includes(fgPat));
      assert.ok(result.secretsDetected.includes('GitHub Personal Access Token'));
    });

    it('redacts private key blocks', () => {
      const fakePrivateKey = [
        '-----BEGIN RSA PRIVATE KEY-----',
        'MIIEowIBAAKCAQEA0Y1234567890abcdef...',
        '-----END RSA PRIVATE KEY-----'
      ].join('\n');

      const result = knowledgeSanitizer.sanitize('SSL Certificate Key', fakePrivateKey, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(!result.redactedContent.includes('MIIEowIBAAKCAQEA0Y1234567890abcdef'));
      assert.ok(result.redactedContent.includes('[REDACTED_SECRET]'));
      assert.ok(result.secretsDetected.includes('Private Key Block'));
    });
  });

  describe('2. Title Redaction & PII Protection', () => {
    it('redacts secrets placed inside knowledge titles', () => {
      const mockKey = makeGoogleKey('TitleSecretKey12345678901234567');
      const title = `Production Key ${mockKey} Deployment`;
      const content = 'Valid deployment configuration instructions.';

      const result = knowledgeSanitizer.sanitize(title, content, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(!result.redactedTitle.includes(mockKey));
      assert.ok(result.redactedTitle.includes('[REDACTED_SECRET]'));
    });

    it('redacts PII (SSN and credit cards) with [REDACTED_PII]', () => {
      const piiText = 'Customer details: SSN 000-12-3456, Visa 4111111111111111';
      const result = knowledgeSanitizer.sanitize('Customer Data', piiText, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(!result.redactedContent.includes('000-12-3456'));
      assert.ok(!result.redactedContent.includes('4111111111111111'));
      assert.ok(result.redactedContent.includes('[REDACTED_PII]'));
      assert.ok(result.personalDataDetected.includes('Social Security Number'));
      assert.ok(result.personalDataDetected.includes('Credit Card Number'));
    });

    it('passes clean technical documentation with isClean === true', () => {
      const cleanDoc = 'To build the application, run npm run build followed by npx cap sync android.';
      const result = knowledgeSanitizer.sanitize('Build Steps', cleanDoc, 'UNVERIFIED');

      assert.strictEqual(result.isClean, true);
      assert.strictEqual(result.secretsDetected.length, 0);
      assert.strictEqual(result.personalDataDetected.length, 0);
      assert.strictEqual(result.redactedContent, cleanDoc);
    });
  });

  describe('3. Epistemic Verification Guard & Integrity', () => {
    it('preserves UNVERIFIED status when secret is removed (no false promotion)', () => {
      const mockKey = makeGoogleKey('UnverifiedKey123456789012345678');
      const text = `Unverified observation with ${mockKey}`;
      const result = knowledgeSanitizer.sanitize('Note', text, 'UNVERIFIED');

      assert.strictEqual(result.adjustedStatus, 'UNVERIFIED', 'Sanitizing secret must never promote to VERIFIED');
    });

    it('demotes VERIFIED status to INFERRED if speculative phrases are used', () => {
      const speculation = 'We suspect the memory leak is caused by unclosed cursors, but this is a hypothesis.';
      const result = knowledgeSanitizer.sanitize('Leak Hypothesis', speculation, 'VERIFIED');

      assert.strictEqual(result.adjustedStatus, 'INFERRED');
      assert.ok(result.warnings.some(w => w.includes('speculative language')));
    });

    it('demotes VERIFIED status to UNVERIFIED if no evidence or SHA-256 seal is provided', () => {
      const unbacked = 'The server latency is strictly below 2ms under 5000 concurrent requests.';
      const result = knowledgeSanitizer.sanitize('Latency Fact', unbacked, 'VERIFIED', []);

      assert.strictEqual(result.adjustedStatus, 'UNVERIFIED');
      assert.ok(result.warnings.some(w => w.includes('without verifiable evidence')));
    });
  });

  describe('4. End-to-End SOURCE Service Integration & Version Audit', () => {
    it('stores redacted title and content when contributing new knowledge entry', () => {
      const familyId = `family_test_${Date.now()}`;
      const mockKey = makeGoogleKey('ServiceIntegrationKey1234567890');

      const outcome = sourceKnowledgeService.contributeKnowledge({
        familyId,
        tenantId: 'tenant_audit_test',
        title: `Setup guide with key: ${mockKey}`,
        content: `Run system test with credential ${mockKey}`,
        category: 'solution_procedure',
        contributor: {
          type: 'droid',
          id: 'droid_security_auditor',
          name: 'Security Auditor'
        }
      });

      assert.strictEqual(outcome.success, true);
      assert.ok(!outcome.entry.title.includes(mockKey));
      assert.ok(!outcome.entry.content.includes(mockKey));
      assert.ok(outcome.entry.title.includes('[REDACTED_SECRET]'));
      assert.ok(outcome.entry.content.includes('[REDACTED_SECRET]'));
      assert.ok(!outcome.entry.versions[0].title.includes(mockKey));
      assert.ok(!outcome.entry.versions[0].content.includes(mockKey));
    });

    it('sanitizes updates and records redacted version snapshot in version history', () => {
      const familyId = `family_test_update_${Date.now()}`;
      const initial = sourceKnowledgeService.contributeKnowledge({
        familyId,
        tenantId: 'tenant_update_test',
        title: 'Initial safe procedure',
        content: 'Original safe step 1',
        category: 'solution_procedure',
        contributor: {
          type: 'user',
          id: 'user_1',
          name: 'Admin'
        }
      });

      const updateKey = makeGoogleKey('UpdateLeakAttempt12345678901234');
      const updateResult = sourceKnowledgeService.updateEntry({
        familyId,
        entryId: initial.entry.id,
        title: `Updated title with ${updateKey}`,
        content: `Updated instructions with ${updateKey}`,
        changedBy: 'Admin',
        changeReason: 'Added config snippet'
      });

      assert.strictEqual(updateResult.success, true);
      assert.ok(updateResult.entry);
      assert.ok(!updateResult.entry.title.includes(updateKey));
      assert.ok(!updateResult.entry.content.includes(updateKey));

      const latestVersion = updateResult.entry.versions[updateResult.entry.versions.length - 1];
      assert.ok(!latestVersion.title.includes(updateKey));
      assert.ok(!latestVersion.content.includes(updateKey));
    });
  });
});
