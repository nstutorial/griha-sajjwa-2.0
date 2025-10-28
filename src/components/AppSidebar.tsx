import { User, Settings, Bell, Receipt, ShoppingCart, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface AppSidebarProps {
  onSettingsClick: () => void;
  onProfileClick: () => void;
}

export function AppSidebar({ onSettingsClick, onProfileClick }: AppSidebarProps) {
  const { state } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { title: 'Loan Reminders', icon: Bell, onClick: () => navigate('/reminders') },
    { title: 'Bill Reminders', icon: Receipt, onClick: () => navigate('/bill-reminders') },
    { title: 'Bill Customers', icon: ShoppingCart, onClick: () => navigate('/bill-customers') },
    { title: 'Partners', icon: Users, onClick: () => navigate('/partners') },
    { title: 'Firm Accounts', icon: Receipt, onClick: () => navigate('/firm-accounts') },
    { title: 'Profile', icon: User, onClick: onProfileClick },
    { title: 'Settings', icon: Settings, onClick: onSettingsClick },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {state !== 'collapsed' && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </div>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={item.onClick}>
                    <item.icon className="h-4 w-4" />
                    {state !== 'collapsed' && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
