'use client';

import { useState } from 'react';
import { X, FileText, Clock, Star, Trash2, Plus } from 'lucide-react';
import { useTabs } from '@/contexts/TabsContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TabSwitcherModal } from '@/components/TabSwitcherModal';

const iconMap = {
  home: FileText,
  recent: Clock,
  favorites: Star,
  trash: Trash2,
};

export function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab } = useTabs();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleNewTab = () => {
    setSwitcherOpen(true);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-b bg-background">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0.5 px-2 pt-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const IconComponent = tab.type === 'page' && tab.icon 
                ? iconMap[tab.icon as keyof typeof iconMap] || FileText
                : FileText;
              const isLastTab = tabs.length === 1;
              
              return (
                <div
                  key={tab.id}
                  className={`group relative flex items-center gap-2 px-4 h-10 transition-all min-w-[160px] max-w-[240px] rounded-t-lg cursor-pointer ${
                    isActive
                      ? 'bg-secondary text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  onClick={() => switchTab(tab.id)}
                >
                  <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  <span className={`text-sm truncate flex-1 ${isActive ? 'font-medium' : ''}`}>
                    {tab.title || 'Untitled'}
                  </span>
                  {!isLastTab && (
                    <button
                      className={`h-5 w-5 p-0 rounded-sm hover:bg-foreground/10 flex-shrink-0 inline-flex items-center justify-center transition-opacity ${
                        isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      aria-label="Close tab"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* New tab button */}
            <button
              onClick={handleNewTab}
              className="flex items-center justify-center h-10 w-10 rounded-t-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              aria-label="Open tab switcher"
              title="Open tab switcher"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>

      {/* Tab Switcher Modal */}
      <TabSwitcherModal 
        open={switcherOpen} 
        onOpenChange={setSwitcherOpen} 
      />
    </>
  );
}
