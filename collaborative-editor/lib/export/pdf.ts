import { getDocument } from '../db/documents';

interface Block {
  id: string;
  type: string;
  props?: Record<string, any>;
  content?: any;
  children?: Block[];
}

export function generatePrintHTML(content: string, title: string): string {
  const blocks = JSON.parse(content);
  const htmlContent = blocksToHTML(blocks);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    
    .document-header {
      text-align: center;
      margin-bottom: 2cm;
      border-bottom: 2px solid #333;
      padding-bottom: 1cm;
    }
    
    .document-title {
      font-size: 24pt;
      font-weight: bold;
      margin: 0;
      color: #000;
    }
    
    .document-date {
      font-size: 10pt;
      color: #666;
      margin-top: 0.5cm;
    }
    
    h1 {
      font-size: 20pt;
      font-weight: bold;
      margin: 1.5cm 0 1cm 0;
      color: #000;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin: 1.2cm 0 0.8cm 0;
      color: #000;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin: 1cm 0 0.6cm 0;
      color: #000;
      page-break-after: avoid;
    }
    
    p {
      margin: 0.5cm 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 0.5cm 0;
      padding-left: 1cm;
    }
    
    li {
      margin: 0.3cm 0;
    }
    
    blockquote {
      margin: 1cm 0;
      padding: 0.5cm 1cm;
      border-left: 4px solid #ccc;
      background-color: #f9f9f9;
      font-style: italic;
    }
    
    pre {
      margin: 1cm 0;
      padding: 1cm;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: avoid;
    }
    
    code {
      font-family: 'Courier New', monospace;
      background-color: #f0f0f0;
      padding: 2px 4px;
      border-radius: 2px;
      font-size: 10pt;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1cm 0;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 0.5cm;
      text-align: left;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    img {
      max-width: 100%;
      height: auto;
      margin: 1cm 0;
      page-break-inside: avoid;
    }
    
    .image-caption {
      text-align: center;
      font-size: 10pt;
      color: #666;
      margin-top: 0.5cm;
      font-style: italic;
    }
    
    .page-number {
      position: running(pageNumber);
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
    
    @page {
      @bottom-center {
        content: counter(page);
        font-size: 10pt;
        color: #666;
      }
    }
    
    .checked-item {
      text-decoration: line-through;
      color: #666;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="document-header">
    <h1 class="document-title">${escapeHtml(title)}</h1>
    <div class="document-date">Generated on ${new Date().toLocaleDateString()}</div>
  </div>
  
  <div class="document-content">
    ${htmlContent}
  </div>
</body>
</html>
  `;
}

function blocksToHTML(blocks: Block[]): string {
  return blocks.map(block => blockToHTML(block)).join('\n');
}

function blockToHTML(block: Block): string {
  switch (block.type) {
    case 'heading':
      const level = block.props?.level || 1;
      return `<h${level}>${getTextContentHTML(block.content)}</h${level}>`;
    
    case 'paragraph':
      return `<p>${getTextContentHTML(block.content)}</p>`;
    
    case 'bulletListItem':
      const bulletContent = `<li>${getTextContentHTML(block.content)}</li>`;
      const bulletChildren = block.children?.map(child => blockToHTML(child)).join('\n') || '';
      return bulletChildren ? `<ul>\n${bulletContent}\n${bulletChildren}\n</ul>` : `<ul>${bulletContent}</ul>`;
    
    case 'numberedListItem':
      const numberedContent = `<li>${getTextContentHTML(block.content)}</li>`;
      const numberedChildren = block.children?.map(child => blockToHTML(child)).join('\n') || '';
      return numberedChildren ? `<ol>\n${numberedContent}\n${numberedChildren}\n</ol>` : `<ol>${numberedContent}</ol>`;
    
    case 'checkListItem':
      const checked = block.props?.checked ? 'checked-item' : '';
      return `<ul><li class="${checked}">${block.props?.checked ? '☑' : '☐'} ${getTextContentHTML(block.content)}</li></ul>`;
    
    case 'codeBlock':
      const language = block.props?.language || '';
      const code = getTextContentHTML(block.content);
      return `<pre><code>${escapeHtml(code.replace(/<[^>]*>/g, ''))}</code></pre>`;
    
    case 'table':
      return tableToHTML(block);
    
    case 'image':
      const alt = escapeHtml(block.props?.name || 'image');
      const url = block.props?.url || '';
      const caption = block.props?.caption ? `<div class="image-caption">${escapeHtml(block.props.caption)}</div>` : '';
      return `<img src="${url}" alt="${alt}" />${caption}`;
    
    default:
      return `<p>${getTextContentHTML(block.content)}</p>`;
  }
}

function getTextContentHTML(content: any): string {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return escapeHtml(content);
  }
  
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return escapeHtml(item);
      if (item.text) {
        let text = escapeHtml(item.text);
        
        if (item.styles) {
          if (item.styles.bold) text = `<strong>${text}</strong>`;
          if (item.styles.italic) text = `<em>${text}</em>`;
          if (item.styles.code) text = `<code>${text}</code>`;
          if (item.styles.strike) text = `<del>${text}</del>`;
        }
        
        return text;
      }
      return '';
    }).join('');
  }
  
  return '';
}

function tableToHTML(block: Block): string {
  if (!block.content?.rows) return '';
  
  const rows = block.content.rows;
  if (rows.length === 0) return '';
  
  let html = '<table>\n';
  
  rows.forEach((row: any[], index: number) => {
    const isHeader = index === 0;
    const tag = isHeader ? 'th' : 'td';
    html += '<tr>\n';
    
    row.forEach((cell: any) => {
      html += `<${tag}>${escapeHtml(String(cell || ''))}</${tag}>\n`;
    });
    
    html += '</tr>\n';
  });
  
  html += '</table>';
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export async function exportDocumentAsPDF(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) {
    throw new Error('Document not found');
  }

  const html = generatePrintHTML(doc.content, doc.title);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups for this site.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for the content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
}
