import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useIsFetching, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  Navbar,
  NavbarContent,
  Avatar,
  Spinner,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
} from "@heroui/react";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { CaretDown, House, Package, ShoppingCart, SignOut, UserCircle, FileText, List, SidebarSimple } from "@phosphor-icons/react";
import { cn } from "../lib/utils";

export default function DashboardLayout() {
  const location = useLocation();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    retry: false,
  });

  if (!isLoading && (isError || !user)) {
    return null;
  }

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <House className="h-5 w-5" /> },
    { name: "Orders", path: "/orders", icon: <ShoppingCart className="h-5 w-5" /> },
    { name: "Products", path: "/products", icon: <Package className="h-5 w-5" /> },
    { name: "Activity Logs", path: "/activity-logs", icon: <FileText className="h-5 w-5" /> },
  ];

  const isFetching = useIsFetching();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("adminSidebarCollapsed");
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("adminSidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    setIsRouteLoading(true);
  }, [location.pathname]);

  useEffect(() => {
    if (isFetching === 0 && !isLoading) {
      const timer = setTimeout(() => setIsRouteLoading(false), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isFetching, isLoading]);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  const displayName = user?.firstName ?? "Admin";
  const displayUsername = user?.username ?? "admin";
  const avatarUrl = user?.avatarUrl;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part: string[]) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-default-200 bg-background py-6 transition-all duration-200 lg:flex lg:flex-col",
          isCollapsed ? "w-20 items-center" : "w-64 px-4"
        )}
      >
        <div className={cn("mb-8 flex items-center gap-2 shrink-0", isCollapsed ? "justify-center" : "px-2")}>
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-linear-to-r from-blue-500 via-indigo-500 to-slate-500 shrink-0">
            <Package className="h-6 w-6 text-white" />
          </div>
          <span className={cn("text-xl font-bold whitespace-nowrap", isCollapsed && "hidden")}>Gebeya Pro</span>
        </div>

        <nav className={cn("flex flex-col gap-2 w-full", isCollapsed && "items-center")}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            const content = (
              <Button
                fullWidth={!isCollapsed}
                isIconOnly={isCollapsed}
                variant={isActive ? "flat" : "light"}
                color={isActive ? "primary" : "default"}
                className={cn("justify-start", isCollapsed && "justify-center")}
                startContent={!isCollapsed ? item.icon : undefined}
                aria-label={item.name}
              >
                {isCollapsed ? item.icon : item.name}
              </Button>
            );

            return (
              <Link key={item.path} to={item.path} className={cn("block", !isCollapsed && "w-full")}>
                {isCollapsed ? (
                  <Tooltip content={item.name} placement="right">
                    {content}
                  </Tooltip>
                ) : (
                  content
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn("mt-auto w-full", isCollapsed ? "flex justify-center" : "")}>
          {isCollapsed ? (
            <Tooltip content="Logout" placement="right">
              <Button
                isIconOnly
                color="danger"
                variant="flat"
                onPress={handleLogout}
                aria-label="Logout"
              >
                <SignOut className="h-5 w-5" />
              </Button>
            </Tooltip>
          ) : (
            <Button
              fullWidth
              color="danger"
              variant="flat"
              startContent={<SignOut className="h-5 w-5" />}
              onPress={handleLogout}
            >
              Logout
            </Button>
          )}
        </div>
      </aside>

      <main className={cn("w-full transition-all duration-200", isCollapsed ? "lg:ml-20" : "lg:ml-64")}>
        <Navbar isBordered maxWidth="full" className="bg-background/70 backdrop-blur-md">
          <NavbarContent justify="start">
            <Button
              isIconOnly
              variant="light"
              className="lg:hidden"
              onPress={() => setIsDrawerOpen(true)}
              aria-label="Open menu"
            >
              <List className="h-5 w-5" />
            </Button>
            <Button
              isIconOnly
              variant="light"
              className="hidden lg:inline-flex"
              onPress={() => setIsCollapsed((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? <List className="h-5 w-5" /> : <SidebarSimple className="h-5 w-5" />}
            </Button>
            <h2 className="text-lg font-semibold">
              {menuItems.find((i) => i.path === location.pathname)?.name || "Admin"}
            </h2>
          </NavbarContent>

          <NavbarContent justify="end">
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button variant="light" className="h-10 px-2">
                  <div className="flex items-center gap-3">
                    <Avatar src={avatarUrl} size="sm" name={initials} />
                    <div className="hidden sm:flex flex-col items-start">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-default-500">@{displayUsername}</p>
                    </div>
                    <CaretDown className="h-4 w-4 text-default-400" />
                  </div>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User menu">
                <DropdownItem
                  key="profile"
                  startContent={<UserCircle className="h-4 w-4" />}
                  textValue="Signed in user"
                  isReadOnly
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-default-500">@{displayUsername}</span>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<SignOut className="h-4 w-4" />}
                  onPress={handleLogout}
                >
                  Logout
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarContent>
        </Navbar>

        <div className="p-6">
          {isLoading || isRouteLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      <Drawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        placement="left"
        classNames={{ base: "w-[90vw] max-w-xs" }}
      >
        <DrawerContent>
          <DrawerHeader className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-bold">Gebeya Pro</span>
          </DrawerHeader>
          <DrawerBody className="space-y-2">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsDrawerOpen(false)}>
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
            <Button
              fullWidth
              color="danger"
              variant="flat"
              startContent={<SignOut className="h-5 w-5" />}
              onPress={handleLogout}
            >
              Logout
            </Button>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}