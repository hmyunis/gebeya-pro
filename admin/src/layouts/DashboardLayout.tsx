import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  Navbar,
  NavbarContent,
  Avatar,
  Spinner,
  Button,
} from "@heroui/react";

// Simple icons (SVG)
const Icons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  Box: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  ),
  Cart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  ),
};

export default function DashboardLayout() {
  const location = useLocation();

  // 1. Check Auth Status
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If error or not admin, Axios interceptor usually handles redirect,
  // but we can add a check here too.
  if (isError || !user) {
    return null; // Redirect logic is in api.ts
  }

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <Icons.Home /> },
    { name: "Orders", path: "/orders", icon: <Icons.Cart /> },
    { name: "Products", path: "/products", icon: <Icons.Box /> },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-default-200 bg-background px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="text-xl font-bold">MyShop</span>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                fullWidth
                variant={location.pathname === item.path ? "flat" : "light"}
                color={location.pathname === item.path ? "primary" : "default"}
                className="justify-start"
                startContent={item.icon}
              >
                {item.name}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <Button
            fullWidth
            color="danger"
            variant="flat"
            startContent={<Icons.LogOut />}
            onPress={async () => {
              await api.post('/auth/logout');
              window.location.href = '/login';
            }}
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 w-full">
        {/* Top Navbar */}
        <Navbar isBordered maxWidth="full" className="bg-background/70 backdrop-blur-md">
          <NavbarContent justify="start">
            <h2 className="text-lg font-semibold">
              {menuItems.find((i) => i.path === location.pathname)?.name || "Admin"}
            </h2>
          </NavbarContent>

          <NavbarContent justify="end">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">{user.firstName}</p>
              <Avatar src={user.avatarUrl} size="sm" />
            </div>
          </NavbarContent>
        </Navbar>

        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
