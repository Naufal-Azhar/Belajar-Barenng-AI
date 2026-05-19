'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Role } from '@/lib/types';
import { messageBubble } from '@/lib/animations';

interface Props {
  role: Role;
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === 'user';

  return (
    <motion.div
      variants={messageBubble}
      initial="hidden"
      animate="visible"
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[85%] rounded-lg px-4 py-3 overflow-hidden break-words ${
          isUser
            ? 'bg-primary text-on-primary'
            : 'bg-surface-card border border-hairline text-body'
        }`}
      >
        {isUser ? (
          <p className="text-body-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-body
                          prose-headings:font-serif prose-headings:text-ink prose-headings:font-normal
                          prose-p:my-1.5 prose-headings:my-2 
                          prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 
                          prose-code:bg-surface-dark prose-code:text-on-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-code
                          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                          prose-strong:text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
