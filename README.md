# Secure Node.js Express Application

This repository contains a secured version of the application. I have patched critical security flaws and verified the fixes using automated tools.

## 🛡️ Security Fixes Implemented:
- **SSTI Protection:** Replaced vulnerable `renderString` in `frontend.js`.
- **SQL Injection Prevention:** Used parameterized queries in `order.js`.
- **RCE & SSRF Mitigation:** Implemented input validation in `system.js`.

## 🔍 Security Audit (Static Analysis):
The project was audited using **Semgrep** with custom rules.
- **Rules Folder:** `/semgrep-rules`
- **Scan Command:** `semgrep --config ./semgrep-rules/ .`
- **Result:** 0 Findings.

## 🚀 How to Run:
1. Run `npm install`.
2. Configure `.env.example` as a template for your `.env` file.
3. Start the server: `node src/server.js`.

## 🛠️ Tools Used:
- **OWASP ZAP:** For Dynamic Analysis.
- **Semgrep:** For Static Code Analysis.
