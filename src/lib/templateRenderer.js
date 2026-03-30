/**
 * Renders email template by replacing placeholders with actual data
 * Supports nested properties and conditional rendering
 */
export function renderTemplate(template, data) {
  if (!template) return { subject: '', body: '' };

  const subject = replacePlaceholders(template.subject || '', data);
  const body = replacePlaceholders(template.body || '', data);

  return { subject, body };
}

function replacePlaceholders(text, data) {
  if (!text || typeof text !== 'string') return '';

  return text.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
    const trimmed = placeholder.trim();
    
    // Handle ternary expressions like {{subHead ? '/ ' + subHead : ''}}
    if (trimmed.includes('?')) {
      return evaluateExpression(trimmed, data);
    }

    // Handle simple property access
    const value = getNestedValue(data, trimmed);
    return value !== undefined && value !== null ? String(value) : '';
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => {
    return current?.[prop];
  }, obj);
}

function evaluateExpression(expr, data) {
  try {
    // Convert placeholder references to data values
    let evaluableExpr = expr;
    const placeholderMatches = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
    
    if (placeholderMatches) {
      const uniquePlaceholders = [...new Set(placeholderMatches)];
      uniquePlaceholders.forEach(placeholder => {
        const value = getNestedValue(data, placeholder);
        if (typeof value === 'string') {
          evaluableExpr = evaluableExpr.replace(
            new RegExp(`\\b${placeholder}\\b`, 'g'),
            `"${value.replace(/"/g, '\\"')}"`
          );
        } else {
          evaluableExpr = evaluableExpr.replace(
            new RegExp(`\\b${placeholder}\\b`, 'g'),
            JSON.stringify(value)
          );
        }
      });
    }

    // Safe evaluation (very basic)
    const result = Function(`"use strict"; return (${evaluableExpr})`)();
    return result ? result : '';
  } catch (e) {
    console.error('Template expression evaluation failed:', e.message);
    return '';
  }
}

/**
 * Validates template has all required placeholders
 */
export function validateTemplate(template, requiredPlaceholders) {
  const combined = (template.subject || '') + ' ' + (template.body || '');
  const missing = [];

  requiredPlaceholders.forEach(placeholder => {
    if (!combined.includes(`{{${placeholder}}}`)) {
      missing.push(placeholder);
    }
  });

  return {
    valid: missing.length === 0,
    missingPlaceholders: missing
  };
}

/**
 * Extracts all placeholders from a template
 */
export function extractPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  return matches ? matches.map(m => m.replace(/[{}]/g, '').trim()) : [];
}