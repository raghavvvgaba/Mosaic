"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAiDraft } from '@/hooks/useAiDraft';
import type { AiOptions } from '@/hooks/aiDraftOptions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getContext?: () => string | undefined;
  onInsert?: (text: string) => void;
}

export function AIDraftDialog({ open, onOpenChange, getContext, onInsert }: Props) {
  const { ui, state, actions } = useAiDraft();
  const [localPrompt, setLocalPrompt] = useState('');

  const disabled = useMemo(() => state.loading || !localPrompt.trim() || !globalThis?.navigator?.onLine, [state.loading, localPrompt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Draft</DialogTitle>
          <DialogDescription>Generate new content with AI and insert it into your note.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              placeholder="e.g., Write an intro paragraph about quantum computing"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tone</Label>
              <select
                className="w-full rounded-md border bg-transparent p-2 text-sm"
                value={ui.options.tone}
                onChange={(e) => ui.setOptions({ ...ui.options, tone: e.target.value as AiOptions['tone'] })}
              >
                <option value="neutral">Neutral</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Length</Label>
              <select
                className="w-full rounded-md border bg-transparent p-2 text-sm"
                value={ui.options.length}
                onChange={(e) => ui.setOptions({ ...ui.options, length: e.target.value as AiOptions['length'] })}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label>Creativity</Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ui.options.temperature}
                onChange={(e) => ui.setOptions({ ...ui.options, temperature: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={ui.options.includeContext}
                onCheckedChange={(v) => ui.setOptions({ ...ui.options, includeContext: Boolean(v) })}
              />
              <Label>Use surrounding context</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => actions.start({ prompt: localPrompt, context: getContext?.() })}
              disabled={disabled}
            >
              {state.loading ? 'Generating…' : 'Generate'}
            </Button>
            {state.loading && (
              <Button variant="outline" onClick={actions.stop}>Stop</Button>
            )}
          </div>

          {!globalThis?.navigator?.onLine && (
            <div className="text-sm text-muted-foreground">Offline — AI generation is disabled.</div>
          )}

          {state.error && (
            <div className="text-sm text-destructive">{state.error}</div>
          )}

          {state.text && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap max-h-60 overflow-auto">
              {state.text}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { actions.reset(); onOpenChange(false); }}>Close</Button>
          <Button disabled={!state.text} onClick={() => { onInsert?.(state.text); actions.reset(); onOpenChange(false); }}>Insert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
