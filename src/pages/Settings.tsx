import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Tag, Settings2 } from 'lucide-react';
import DepartmentTab from '@/components/settings/DepartmentTab';
import UsersRolesTab from '@/components/settings/UsersRolesTab';
import MailCategoriesTab from '@/components/settings/MailCategoriesTab';
import SystemConfigTab from '@/components/settings/SystemConfigTab';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration du système et gestion institutionnelle</p>
      </div>

      <Tabs defaultValue="departments" className="space-y-6">
        <TabsList className="bg-muted/50 h-11 p-1 rounded-xl">
          <TabsTrigger value="departments" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Building2 className="h-3.5 w-3.5" /> Services
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Users className="h-3.5 w-3.5" /> Utilisateurs & Rôles
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Tag className="h-3.5 w-3.5" /> Types & Catégories
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Settings2 className="h-3.5 w-3.5" /> Système & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments"><DepartmentTab /></TabsContent>
        <TabsContent value="users"><UsersRolesTab /></TabsContent>
        <TabsContent value="categories"><MailCategoriesTab /></TabsContent>
        <TabsContent value="system"><SystemConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}
