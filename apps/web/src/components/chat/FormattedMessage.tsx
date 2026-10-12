'use client';

import React from 'react';
import { ExternalLink, Folder, FileText } from 'lucide-react';

interface FormattedMessageProps {
  content: string;
}

export default function FormattedMessage({ content }: FormattedMessageProps) {
  if (!content) return null;

  const lines = content.split('\n');

  const renderInline = (text: string): React.ReactNode => {
    // Regex for [label](url), **bold**, `code`
    const parts: React.ReactNode[] = [];
    const regex = /(\[.*?\]\(https?:\/\/[^\s)]+\)|\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith('[') && token.includes('](')) {
        // Markdown link [Label](URL)
        const labelMatch = token.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
        if (labelMatch) {
          const [, label, url] = labelMatch;
          const isDriveFolder = url.includes('/folders/');
          const isDriveFile = url.includes('/file/d/');
          parts.push(
            <a
              key={match.index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 hover:bg-indigo-50/80 px-1.5 py-0.5 rounded transition-all group"
            >
              {isDriveFolder ? (
                <Folder size={12} className="text-amber-500 flex-shrink-0" />
              ) : isDriveFile ? (
                <FileText size={12} className="text-blue-500 flex-shrink-0" />
              ) : null}
              <span>{label}</span>
              <ExternalLink size={10} className="text-indigo-400 group-hover:text-indigo-600 opacity-70 flex-shrink-0" />
            </a>
          );
        } else {
          parts.push(token);
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        // Bold
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        // Inline code
        parts.push(
          <code key={match.index} className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-xs font-mono">
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Horizontal rule
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="my-2.5 border-slate-200" />;
        }

        // H3 Header
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1 flex items-center gap-1.5">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }

        // H4 Header
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="font-semibold text-slate-900 text-xs tracking-wide uppercase text-slate-600 mt-2.5 mb-1">
              {renderInline(trimmed.slice(5))}
            </h4>
          );
        }

        // Bullet items: starts with * or - or •
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const bulletText = trimmed.replace(/^(\*|-|•)\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-indigo-400 text-xs mt-1">•</span>
              <div className="flex-1">{renderInline(bulletText)}</div>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Regular paragraph line
        return (
          <p key={idx} className="my-0.5">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
