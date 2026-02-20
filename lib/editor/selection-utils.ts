import type { BlockNoteEditor, Block } from '@blocknote/core'
import { sanitizeMarkdownForInsert } from '@/lib/ai/markdown-insert'

export interface SelectionInfo {
  text: string
  blocks: Block[]
}

// Type for BlockNote block content
type InlineContent = {
  type?: string
  text?: string
  [key: string]: unknown
}

type BlockContent = InlineContent[] | string | undefined
type BlockWithContent = Block & { content?: BlockContent }

type TiptapEditor = {
  state: {
    selection: { empty: boolean }
    tr: { replaceSelectionWith: (node: unknown) => void }
  }
  schema: {
    text: (text: string) => unknown
  }
  view: { dispatch: (tr: unknown) => void }
}

type MarkdownCapableEditor = BlockNoteEditor & {
  tryParseMarkdownToBlocks?: (markdown: string) => unknown[]
}

function getTiptapEditor(editor: BlockNoteEditor): TiptapEditor | null {
  const maybe = (editor as unknown as { _tiptapEditor?: TiptapEditor })._tiptapEditor
  return maybe ?? null
}

function hasLikelyBlockMarkdown(text: string): boolean {
  return /(^\s*#{1,6}\s)|(^\s*[-*+]\s)|(^\s*\d+\.\s)|(^\s*>\s)|```|\n/m.test(text)
}

function replaceSelectionWithMarkdownBlocks(editor: BlockNoteEditor, newText: string): boolean {
  if (!hasLikelyBlockMarkdown(newText)) return false
  try {
    const markdownEditor = editor as MarkdownCapableEditor
    if (typeof markdownEditor.tryParseMarkdownToBlocks !== 'function') return false
    const selection = editor.getSelection()
    if (!selection || selection.blocks.length === 0) return false

    const sanitized = sanitizeMarkdownForInsert(newText)
    const parsedBlocks = markdownEditor.tryParseMarkdownToBlocks(sanitized)
    if (!Array.isArray(parsedBlocks) || parsedBlocks.length === 0) return false

    editor.insertBlocks(parsedBlocks as unknown as Block[], selection.blocks[0], 'before')
    editor.removeBlocks(selection.blocks)
    return true
  } catch (error) {
    console.error('Markdown block replacement failed:', error)
    return false
  }
}

/**
 * Extract selected text from BlockNote editor using only BlockNote APIs
 */
export function getSelectedText(editor: BlockNoteEditor): SelectionInfo {
  try {
    // Get selection using BlockNote's API
    const selection = editor.getSelection()

    if (!selection || selection.blocks.length === 0) {
      return {
        text: '',
        blocks: [],
      }
    }

    // Extract text from selected blocks
    const selectedText = extractTextFromBlocks(selection.blocks)

    return {
      text: selectedText,
      blocks: selection.blocks,
    }
  } catch (error) {
    console.error('Error getting selected text:', error)
    return {
      text: '',
      blocks: [],
    }
  }
}

/**
 * Extract text content from an array of BlockNote blocks
 */
function extractTextFromBlocks(blocks: Block[]): string {
  const texts: string[] = []

  blocks.forEach(block => {
    // Access block content through the correct property
    const content = (block as BlockWithContent).content
    if (content) {
      if (typeof content === 'string') {
        texts.push(content)
      } else if (Array.isArray(content)) {
        // Handle inline content array
        const text = content
          .filter((item) => item && typeof item === 'object' && 'text' in item)
          .map((item) => (typeof item.text === 'string' ? item.text : ''))
          .join('')
        if (text) {
          texts.push(text)
        }
      }
    }
  })

  return texts.join('\n').trim()
}

/**
 * Check if text is currently selected in the editor
 */
export function hasTextSelection(editor: BlockNoteEditor): boolean {
  const selection = editor.getSelection()
  if (!selection || selection.blocks.length === 0) {
    return false
  }

  // Check if any selected blocks have actual text content
  const blocks = selection.blocks as BlockWithContent[]
  return blocks.some(block => {
    const content = block.content
    if (content) {
      if (typeof content === 'string') {
        return content.trim().length > 0
      }
      if (Array.isArray(content)) {
        return content.some((item) => typeof item?.text === 'string' && item.text.trim().length > 0)
      }
    }
    return false
  })
}

/**
 * Replace selected text with new text in BlockNote editor
 */
export function replaceSelectedText(editor: BlockNoteEditor, newText: string): boolean {
  try {
    // Get the current selection to use ProseMirror directly
    const tiptap = getTiptapEditor(editor)
    if (!tiptap) return false
    const pmSelection = tiptap.state.selection

    if (!pmSelection || pmSelection.empty) {
      return false
    }

    if (replaceSelectionWithMarkdownBlocks(editor, newText)) {
      return true
    }

    // Use ProseMirror's transaction to replace the selected text
    const { tr } = tiptap.state
    tr.replaceSelectionWith(tiptap.schema.text(newText))
    tiptap.view.dispatch(tr)

    return true
  } catch (error) {
    console.error('Error replacing selected text:', error)

    // Fallback: insert a new block
    try {
      const selection = editor.getSelection()
      if (selection && selection.blocks.length > 0) {
        const newBlock = {
          type: 'paragraph',
          content: [{ type: 'text', text: newText }]
        } as unknown as Block

        editor.insertBlocks([newBlock], selection.blocks[0], 'before')
        editor.removeBlocks(selection.blocks)
        return true
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }

    return false
  }
}

/**
 * Insert text below the current selection/position in BlockNote editor
 */
export function insertTextBelow(editor: BlockNoteEditor, text: string): boolean {
  try {
    // Get current cursor position
    const cursorPos = editor.getTextCursorPosition()
    if (!cursorPos) {
      return false
    }

    // Create a simple paragraph block object (without explicit ID - BlockNote will generate one)
    const newBlock = {
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text }]
    } as unknown as Block

    // Insert after current block
    const currentBlock = cursorPos.block
    if (currentBlock) {
      editor.insertBlocks([newBlock], currentBlock, 'after')
      return true
    }

    return false
  } catch (error) {
    console.error('Error inserting text below:', error)

    // Fallback: try to use a different approach
    try {
      const cursorPos = editor.getTextCursorPosition()
      if (cursorPos && cursorPos.block) {
        // Try to create the block with minimal properties
        const simpleBlock = {
          type: 'paragraph',
          content: typeof text === 'string' ? [{ type: 'text', text }] : text
        } as unknown as Block
        editor.insertBlocks([simpleBlock], cursorPos.block, 'after')
        return true
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }

    return false
  }
}
