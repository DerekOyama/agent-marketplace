#!/usr/bin/env node

/**
 * Comprehensive validation script to check for JSON type issues
 * This script helps prevent compilation errors by validating all JSON-related code
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ValidationIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
}

const issues: ValidationIssue[] = [];

function addIssue(file: string, line: number, issue: string, severity: 'error' | 'warning' = 'error') {
  issues.push({ file, line, issue, severity });
}

function validateFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for problematic patterns
    
    // 1. Direct null comparison in Prisma queries (skip validation script itself)
    if (line.includes('{ not: null }') && !filePath.includes('validate-json-types.ts')) {
      addIssue(filePath, lineNum, 'Direct null comparison in Prisma query - use filter instead', 'error');
    }

    // 2. Unsafe 'as any' usage (skip validation script itself)
    if (line.includes('as any') && !line.includes('// Temporary') && !line.includes('// TODO') && !filePath.includes('validate-json-types.ts')) {
      addIssue(filePath, lineNum, 'Unsafe "as any" usage - use proper typing', 'warning');
    }

    // 3. Direct schema assignment without JSON.parse(JSON.stringify()) (skip validation script itself)
    if (line.includes('CommonAgentSchemas.') && (line.includes('Schema:') || line.includes('inputSchema:') || line.includes('outputSchema:')) && 
        !line.includes('JSON.parse(JSON.stringify(') && !line.includes('//') && !filePath.includes('validate-json-types.ts')) {
      addIssue(filePath, lineNum, 'Direct schema assignment - needs JSON serialization', 'error');
    }

    // 4. StandardAgentInput/Output in JSON context without serialization
    if ((line.includes('StandardAgentInput') || line.includes('StandardAgentOutput')) && 
        line.includes('payload:') && !line.includes('JSON.parse(JSON.stringify(')) {
      addIssue(filePath, lineNum, 'Standard agent types in JSON payload - needs serialization', 'error');
    }

    // 5. inputSchema/outputSchema property access without null check
    if ((line.includes('.inputSchema') || line.includes('.outputSchema')) && 
        !line.includes('?') && !line.includes('if (') && !line.includes('&&')) {
      addIssue(filePath, lineNum, 'Schema property access without null check', 'warning');
    }
  });
}

async function validateAllFiles() {
  console.log('🔍 Validating JSON type usage across the codebase...\n');

  // Find all TypeScript files
  const tsFiles = await glob('**/*.ts', { 
    cwd: process.cwd(),
    ignore: ['node_modules/**', 'dist/**', '.next/**']
  });

  // Validate each file
  for (const file of tsFiles) {
    validateFile(file);
  }

  // Report results
  console.log(`📊 Validation Results:`);
  console.log(`   Files checked: ${tsFiles.length}`);
  console.log(`   Issues found: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log('✅ No JSON type issues found! The codebase should compile successfully.');
    return true;
  }

  // Group issues by severity
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.log('❌ ERRORS (will cause compilation failure):');
    errors.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (should be addressed):');
    warnings.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
    });
    console.log('');
  }

  console.log('🔧 Suggested fixes:');
  console.log('1. Replace "{ not: null }" with filtering after query');
  console.log('2. Replace "as any" with proper type assertions');
  console.log('3. Use JSON.parse(JSON.stringify()) for schema assignments');
  console.log('4. Add null checks for schema property access');
  console.log('5. Serialize complex types before JSON storage');

  return errors.length === 0;
}

// Run validation
validateAllFiles()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
