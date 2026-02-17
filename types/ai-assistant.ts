export type AssistantMode = 'chat' | 'draft'

export type AssistantMessageKind = 'chat' | 'draft_result' | 'error' | 'system'

export type AssistantSender = 'user' | 'assistant' | 'system'

export type AssistantDraftOptions = {
  tone: 'neutral' | 'friendly' | 'formal'
  length: 'short' | 'medium' | 'long'
  temperature: number
  includeContext: boolean
}

export type AssistantDraftPayload = {
  prompt: string
  context?: string
  options: AssistantDraftOptions
}

export type AssistantMessage = {
  id: string
  sender: AssistantSender
  kind: AssistantMessageKind
  text: string
  timestamp: number
  draftPayload?: AssistantDraftPayload
}

export type AssistantPersistedSession = {
  version: 1
  savedAt: number
  mode: AssistantMode
  messages: AssistantMessage[]
  lastDraftPayload: AssistantDraftPayload | null
}
