"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Box,
  Server,
  Terminal,
  ChevronRight,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

const navItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Core Modules",
    url: "#",
    icon: Box,
    items: [
      { title: "Tenancy", url: "#" },
      { title: "Inventory", url: "#" },
      { title: "CRM", url: "#" },
      { title: "Websites", url: "#" },
    ],
  },
  {
    title: "Infrastructure",
    url: "#",
    icon: Server,
    items: [
      { title: "Postgres", url: "#" },
      { title: "Redis", url: "#" },
      { title: "Workflows", url: "#" },
    ],
  },
  {
    title: "Platform Logs",
    url: "#",
    icon: Terminal,
  },
];

export function AdminSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Box className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">VIMS Platform</span>
                <span className="truncate text-xs">Admin Console</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/menu-item:rotate-90" />
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton render={<a href={subItem.url} />}>
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </>
                ) : (
                  <SidebarMenuButton 
                    render={<a href={item.url} />} 
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-sidebar-border">
          <ConnectWalletButton className="w-full justify-start h-10 px-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" />
      </SidebarFooter>
    </Sidebar>
  );
}
