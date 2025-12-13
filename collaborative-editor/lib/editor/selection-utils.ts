import type { BlockNoteEditor, Block } from '@blocknote/core'

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
    const blockAny = block as any
    if (blockAny.content) {
      if (typeof blockAny.content === 'string') {
        texts.push(blockAny.content)
      } else if (Array.isArray(blockAny.content)) {
        // Handle inline content array
        const text = blockAny.content
          .filter((item: any) => item && typeof item === 'object' && 'text' in item)
          .map((item: any) => item.text || '')
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
  const blocks = selection.blocks as any[]
  return blocks.some(block => {
    if (block.content) {
      if (typeof block.content === 'string') {
        return block.content.trim().length > 0
      }
      if (Array.isArray(block.content)) {
        return block.content.some((item: any) => item && item.text && item.text.trim().length > 0)
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
    const pmSelection = (editor as any)._tiptapEditor.state.selection
    const editorAny = editor as any

    if (!pmSelection || pmSelection.empty) {
      return false
    }

    // Use ProseMirror's transaction to replace the selected text
    const { tr } = (editor as any)._tiptapEditor.state
    tr.replaceSelectionWith(
      (editor as any)._tiptapEditor.schema.text(newText)
    )
    ;(editor as any)._tiptapEditor.view.dispatch(tr)

    return true
  } catch (error) {
    console.error('Error replacing selected text:', error)

    // Fallback: insert a new block
    try {
      const selection = editor.getSelection()
      if (selection && selection.blocks.length > 0) {
        const editorFallback = editor as any
        const newBlock = editorFallback.schema.paragraph.create([
          editorFallback.schema.text(newText)
        ]) as any

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
    } as any // Cast to any to bypass strict type checking

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
        }
        editor.insertBlocks([simpleBlock as any], cursorPos.block, 'after')
        return true
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }

    return false
  }
}