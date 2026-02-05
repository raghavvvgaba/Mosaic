'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-background/50">
      <DashboardTopBar 
        selectionMode={false}
        onToggleSelectionMode={() => {}}
        selectedCount={0}
        showSelectAll={false}
      />

      <main className="flex-1 w-full overflow-y-auto">
        <div className="container max-w-5xl mx-auto py-6 md:py-8 px-4 pb-24 md:pb-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">Manage your account and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 min-w-max">
                <TabsTrigger
                  value="profile"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 text-sm md:text-base"
                >
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 text-sm md:text-base"
                >
                  Appearance
                </TabsTrigger>
                <TabsTrigger
                  value="account"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 text-sm md:text-base"
                >
                  Account Security
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-6 md:mt-8">
              <TabsContent value="profile" className="m-0">
                <ProfileSettings />
              </TabsContent>

              <TabsContent value="appearance" className="m-0">
                <AppearanceSettings />
              </TabsContent>

              <TabsContent value="account" className="m-0">
                <AccountSettings />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
