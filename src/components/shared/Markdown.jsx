import { Fragment } from 'react';

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: headers (# ## ###), bold (**), italic (*), inline code (`),
 * bullet lists (- or *), numbered lists (1.), paragraphs, line breaks.
 * Intentionally minimal — good enough for Claude's chat output.
 */
export default function Markdown({ text }) {
  if (!text) return null;

  const lines = String(text).split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (/^###\s+/.test(line)) {
      blocks.push({ type: 'h3', content: line.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ type: 'h2', content: line.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      blocks.push({ type: 'h1', content: line.replace(/^#\s+/, '') });
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Blank line — flush nothing, skip
    if (line.trim() === '') {
      blocks.push({ type: 'break' });
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paragraphLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', content: paragraphLines.join(' ') });
  }

  return (
    <div className="md">
      {blocks.map((b, idx) => renderBlock(b, idx))}
    </div>
  );
}

function renderBlock(block, key) {
  switch (block.type) {
    case 'h1':
      return <h3 key={key} className="md-h1">{renderInline(block.content)}</h3>;
    case 'h2':
      return <h4 key={key} className="md-h2">{renderInline(block.content)}</h4>;
    case 'h3':
      return <h5 key={key} className="md-h3">{renderInline(block.content)}</h5>;
    case 'ul':
      return (
        <ul key={key} className="md-ul">
          {block.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="md-ol">
          {block.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}
        </ol>
      );
    case 'break':
      return null;
    case 'p':
    default:
      return <p key={key} className="md-p">{renderInline(block.content)}</p>;
  }
}

// Inline formatting: **bold**, *italic*, `code`
function renderInline(text) {
  if (!text) return null;
  // Split on markers while preserving them using a token approach
  const tokens = tokenize(text);
  return tokens.map((t, i) => {
    switch (t.type) {
      case 'bold':
        return <strong key={i}>{renderInline(t.content)}</strong>;
      case 'italic':
        return <em key={i}>{t.content}</em>;
      case 'code':
        return <code key={i} className="md-code">{t.content}</code>;
      case 'text':
      default:
        return <Fragment key={i}>{t.content}</Fragment>;
    }
  });
}

// Simple tokenizer for **bold**, *italic*, `code`
function tokenize(text) {
  const tokens = [];
  let buf = '';
  let i = 0;

  const flush = () => {
    if (buf) {
      tokens.push({ type: 'text', content: buf });
      buf = '';
    }
  };

  while (i < text.length) {
    // **bold**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        tokens.push({ type: 'bold', content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // *italic* (not part of **)
    if (text[i] === '*' && text[i + 1] !== '*' && text[i - 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && text[end + 1] !== '*') {
        flush();
        tokens.push({ type: 'italic', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        tokens.push({ type: 'code', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return tokens;
}
