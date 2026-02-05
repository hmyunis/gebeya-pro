import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Input,
  Skeleton,
  addToast,
} from "@heroui/react";
import { UserCircle, UploadSimple } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { getImageUrl } from "../../types";

type AdminProfile = {
  id: number;
  role: string;
  firstName?: string | null;
  username?: string | null;
  loginUsername?: string | null;
  avatarUrl?: string | null;
};

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const profileQuery = useQuery<AdminProfile>({
    queryKey: ["admin", "profile"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setFullName(profileQuery.data.firstName ?? "");
    setAvatarUrl(profileQuery.data.avatarUrl ?? "");
  }, [profileQuery.data]);

  const avatarSrc = useMemo(
    () => (avatarUrl ? getImageUrl(avatarUrl) : undefined),
    [avatarUrl]
  );

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { firstName: string }) =>
      api.patch("/users/me", payload),
    onSuccess: () => {
      addToast({
        title: "Profile updated",
        description: "Your profile details were saved.",
        color: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      addToast({
        title: "Update failed",
        description: err.response?.data?.message || "Failed to update profile.",
        color: "danger",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (response) => {
      const nextAvatar = response.data?.avatarUrl ?? "";
      setAvatarUrl(nextAvatar);
      addToast({
        title: "Avatar updated",
        description: "Your new avatar is saved.",
        color: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      addToast({
        title: "Upload failed",
        description: err.response?.data?.message || "Failed to upload avatar.",
        color: "danger",
      });
    },
  });

  const handleAvatarPick = () => fileInputRef.current?.click();
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      addToast({
        title: "Invalid file",
        description: "Please select an image file.",
        color: "warning",
      });
      return;
    }
    uploadAvatarMutation.mutate(file);
    event.target.value = "";
  };

  const isLoading = profileQuery.isLoading;
  const username =
    profileQuery.data?.loginUsername ||
    profileQuery.data?.username ||
    "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-default-500">Manage your admin profile details.</p>
      </div>

      <Card>
        <CardBody className="space-y-6 p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar src={avatarSrc} size="lg" name={fullName || "Admin"} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {fullName || "Admin"}
                  </span>
                  <span className="text-xs text-default-500">@{username}</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="flat"
                  startContent={<UploadSimple className="h-4 w-4" />}
                  onPress={handleAvatarPick}
                  isLoading={uploadAvatarMutation.isPending}
                >
                  Upload avatar
                </Button>
                <span className="text-xs text-default-500">
                  PNG or JPG, square images look best.
                </span>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <Input
                  label="Full name"
                  value={fullName}
                  onValueChange={setFullName}
                  placeholder="Admin Name"
                  startContent={<UserCircle className="h-4 w-4" />}
                  className="md:flex-1"
                />
                <Button
                  color="primary"
                  onPress={() =>
                    updateProfileMutation.mutate({ firstName: fullName.trim() })
                  }
                  isLoading={updateProfileMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
