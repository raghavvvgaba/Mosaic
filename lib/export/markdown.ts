import { getDocument } from '../db/documents';

interface BlockProps {
  level?: number;
  checked?: boolean;
  language?: string;
  name?: string;
  url?: string;
  caption?: string;
}

interface InlineStyles {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
}

type InlineNode = string | { text?: string; styles?: InlineStyles };

type TableContent = { rows?: unknown };

type BlockContent = string | InlineNode[] | TableContent | null | undefined;

interface Block {
  id: string;
  type: string;
  props?: BlockProps;
  content?: BlockContent;
  children?: Block[];
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(block => blockToMarkdown(block)).join('\n\n');
}

function blockToMarkdown(block: Block, depth: number = 0): string {
  const indent = '  '.repeat(depth);

  switch (block.type) {
    case 'heading':
      const level = '#'.repeat(block.props?.level || 1);
      return `${level} ${getTextContent(block.content)}`;
    
    case 'paragraph':
      return getTextContent(block.content) || '';
    
    case 'bulletListItem':
      const bulletContent = `${indent}- ${getTextContent(block.content)}`;
      const bulletChildren = block.children?.map(child => blockToMarkdown(child, depth + 1)).join('\n') || '';
      return bulletChildren ? `${bulletContent}\n${bulletChildren}` : bulletContent;
    
    case 'numberedListItem':
      const numberedContent = `${indent}1. ${getTextContent(block.content)}`;
      const numberedChildren = block.children?.map(child => blockToMarkdown(child, depth + 1)).join('\n') || '';
      return numberedChildren ? `${numberedContent}\n${numberedChildren}` : numberedContent;
    
    case 'checkListItem':
      const checked = block.props?.checked ? '[x]' : '[ ]';
      return `${indent}- ${checked} ${getTextContent(block.content)}`;
    
    case 'codeBlock':
      const language = block.props?.language || '';
      const code = getTextContent(block.content);
      return `\`\`\`${language}\n${code}\n\`\`\``;
    
    case 'table':
      return tableToMarkdown(block);
    
    case 'image':
      const alt = block.props?.name || 'image';
      const url = block.props?.url || '';
      const caption = block.props?.caption ? `\n*${block.props.caption}*` : '';
      return `![${alt}](${url})${caption}`;
    
    default:
      return getTextContent(block.content) || '';
  }
}

function getTextContent(content: BlockContent): string {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          const { text, styles } = item as { text?: unknown; styles?: InlineStyles };
          if (typeof text !== 'string') {
            return '';
          }

          let decorated = text;

          if (styles?.bold) decorated = `**${decorated}**`;
          if (styles?.italic) decorated = `*${decorated}*`;
          if (styles?.code) decorated = `\`${decorated}\``;
          if (styles?.strike) decorated = `~~${decorated}~~`;

          return decorated;
        }
        return '';
      })
      .join('');
  }
  
  return '';
}

function tableToMarkdown(block: Block): string {
  const content = block.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return '';
  }

  const { rows } = content as TableContent & { rows?: unknown };
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  let markdown = '';

  rows.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    markdown += '| ' + row.map((cell) => String(cell ?? '')).join(' | ') + ' |\n';

    if (index === 0) {
      markdown += '| ' + row.map(() => '---').join(' | ') + ' |\n';
    }
  });

  return markdown.trim();
}

export async function exportDocumentAsMarkdown(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) {
    throw new Error('Document not found');
  }

  const blocks = JSON.parse(doc.content);
  const markdown = `# ${doc.title}\n\n${blocksToMarkdown(blocks)}`;

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title || 'Untitled'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
