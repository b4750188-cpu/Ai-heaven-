# Security Policy - AI Heaven

AI Heaven takes the security of its ecosystem, autonomous droids, model routers, and execution sandboxes seriously.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within AI Heaven, please follow these guidelines:

1. **Do not create public GitHub issues** for security vulnerabilities.
2. Report vulnerabilities privately via GitHub Security Advisories or via email to `security@aiheaven.local`.
3. Provide detailed steps to reproduce the vulnerability, including:
   - Target component (Central Brain, VFS Sandbox, Authentication Gate, Scanner Registry, Android Native Bridge).
   - Impact assessment and potential attack vectors.
   - Proof of concept (PoC) code or requests without exploiting live production systems.
4. The AI Heaven core security team will acknowledge receipt within 24 hours and provide regular updates on remediation progress.

## Security Controls & Defense-in-Depth

- **Central Brain Target Isolation**: Active security testing and network egress are strictly restricted to explicitly authorized targets defined in `ScanTargetScope`.
- **Sandbox Barriers**: File execution runs in isolated virtual file systems with permanent prevention of host-escalation commands (exit code 126).
- **Zero Client Secrets**: Android APK and client builds contain zero private API keys or signing secrets; all privileged interactions are proxied through authenticated backend APIs.
- **Draugr & OWASP DefectDojo Findings Management**: Security findings undergo cryptographic deduplication (SHA-256), risk enrichment via CISA KEV and EPSS, and strict remediation tracking.
- **OpenSSF Scorecard Compliance**: Continuous automated audit of supply-chain dependencies, workflow token permissions, and branch protection.
