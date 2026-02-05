import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { api } from "../lib/api";

type MeResponse = {
  userId?: number;
  role?: string;
  firstName?: string;
  username?: string;
  avatarUrl?: string;
};

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<MeResponse>("/auth/me");
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data || data.role !== "admin") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
