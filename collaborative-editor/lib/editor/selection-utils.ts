import type { BlockNoteEditor } from '@blocknote/core'

export interface SelectionInfo {
  text: string
  range: Range | null
  bounds: DOMRect | null
}

/**
 * Extract selected text from BlockNote editor
 */
export function getSelectedText(editor: BlockNoteEditor): SelectionInfo {
  try {
    // Get the current selection from the DOM
    const selection = window.getSelection()

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return {
        text: '',
        range: null,
        bounds: null,
      }
    }

    const range = selection.getRangeAt(0)
    const text = range.toString().trim()

    if (!text) {
      return {
        text: '',
        range: null,
        bounds: null,
      }
    }

    // Get the bounding rectangle of the selection
    const bounds = range.getBoundingClientRect()

    return {
      text,
      range,
      bounds,
    }
  } catch (error) {
    console.error('Error getting selected text:', error)
    return {
      text: '',
      range: null,
      bounds: null,
    }
  }
}

/**
 * Check if text is currently selected in the editor
 */
export function hasTextSelection(editor: BlockNoteEditor): boolean {
  const selection = getSelectedText(editor)
  return selection.text.length > 0
}

/**
 * Get positioning information for displaying elements below selected text
 */
export function getPositionBelowSelection(selection: SelectionInfo, container?: HTMLElement): {
  top: number
  left: number
  width: number
} | null {
  if (!selection.bounds) {
    return null
  }

  let top = selection.bounds.bottom + 8
  let left = selection.bounds.left
  const width = selection.bounds.width

  // If container is provided, adjust coordinates to be relative to container
  if (container) {
    const containerBounds = container.getBoundingClientRect()

    // Adjust coordinates to be relative to the container
    top = selection.bounds.bottom - containerBounds.top + 8
    left = selection.bounds.left - containerBounds.left

    // Ensure coordinates are within container bounds
    top = Math.max(0, top)
    left = Math.max(0, left)
  }

  return {
    top,
    left,
    width,
  }
}

/**
 * Replace selected text with new text in BlockNote editor
 */
export function replaceSelectedText(editor: BlockNoteEditor, newText: string): boolean {
  try {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return false
    }

    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(newText))

    return true
  } catch (error) {
    console.error('Error replacing selected text:', error)
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

    // Insert a new paragraph with the text
    const newBlock = {
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text }],
    }

    // Insert after current block
    const currentBlock = cursorPos.block
    if (currentBlock) {
      editor.insertBlocks([newBlock], currentBlock, 'after')
      return true
    }

    return false
  } catch (error) {
    console.error('Error inserting text below:', error)
    return false
  }
}