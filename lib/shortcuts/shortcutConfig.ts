export interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: ShortcutCategory;
  action: () => void | Promise<void>;
  enabled?: boolean;
  global?: boolean; // Works anywhere in the app
  context?: 'editor' | 'navigation' | 'global'; // Where this shortcut is active
}

export type ShortcutCategory = 
  | 'general'
  | 'navigation' 
  | 'document'
  | 'editor'
  | 'app';

export interface ShortcutCategoryInfo {
  name: string;
  description: string;
}

export const SHORTCUT_CATEGORIES: Record<ShortcutCategory, ShortcutCategoryInfo> = {
  general: {
    name: 'General',
    description: 'App-wide shortcuts'
  },
  navigation: {
    name: 'Navigation', 
    description: 'Moving around the app'
  },
  document: {
    name: 'Document',
    description: 'Document management'
  },
  editor: {
    name: 'Editor',
    description: 'Text editing and formatting'
  },
  app: {
    name: 'App',
    description: 'Application controls'
  }
};

// Platform detection
export const isMac = typeof window !== 'undefined' && 
  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

export const MODIFIER_KEY = isMac ? 'metaKey' : 'ctrlKey';
export const MODIFIER_SYMBOL = isMac ? '⌘' : 'Ctrl';

// Helper to format key combinations
export function formatKeys(keys: string[]): string {
  return keys.map(key => {
    switch (key.toLowerCase()) {
      case 'meta': return isMac ? '⌘' : 'Ctrl';
      case 'ctrl': return isMac ? '⌘' : 'Ctrl';
      case 'shift': return '⇧';
      case 'alt': return isMac ? '⌥' : 'Alt';
      case 'enter': return '↵';
      case 'escape': return 'Esc';
      case 'space': return 'Space';
      case 'arrowup': return '↑';
      case 'arrowdown': return '↓';
      case 'arrowleft': return '←';
      case 'arrowright': return '→';
      case 'tab': return 'Tab';
      case 'delete': return 'Del';
      case 'backspace': return '⌫';
      default:
        return key.length === 1 ? key.toUpperCase() : key;
    }
  }).join(isMac ? '' : '+');
}

// Helper to check if keyboard event matches shortcut keys
export function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  const normalizedKeys = keys.map(key => key.toLowerCase());
  
  // Check modifier keys
  const hasMeta = normalizedKeys.includes('meta') || normalizedKeys.includes('ctrl');
  const hasShift = normalizedKeys.includes('shift');
  const hasAlt = normalizedKeys.includes('alt');
  
  // Check if modifiers match
  if (hasMeta && !event[MODIFIER_KEY]) return false;
  if (!hasMeta && event[MODIFIER_KEY]) return false;
  if (hasShift && !event.shiftKey) return false;
  if (!hasShift && event.shiftKey && !normalizedKeys.includes('shift')) return false;
  if (hasAlt && !event.altKey) return false;
  if (!hasAlt && event.altKey && !normalizedKeys.includes('alt')) return false;
  
  // Check main key
  const mainKey = normalizedKeys.find(key => 
    !['meta', 'ctrl', 'shift', 'alt'].includes(key)
  );
  
  if (!mainKey) return false;
  
  // Map key names to event key values
  const keyMap: Record<string, string> = {
    'escape': 'escape',
    'esc': 'escape',
    'enter': 'enter',
    'return': 'enter',
    'space': ' ',
    'arrowup': 'arrowup',
    'arrowdown': 'arrowdown',
    'arrowleft': 'arrowleft',
    'arrowright': 'arrowright',
    'tab': 'tab',
    'delete': 'delete',
    'backspace': 'backspace',
  };
  
  const expectedKey = keyMap[mainKey] || mainKey;
  
  // For number keys, check both the number and the numpad
  if (/^\d$/.test(expectedKey)) {
    return event.key === expectedKey || event.code === `Numpad${expectedKey}`;
  }
  
  return event.key.toLowerCase() === expectedKey.toLowerCase();
}
