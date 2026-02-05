import {
  Button,
  Card,
  CardBody,
  Divider,
  Input,
  Skeleton,
  addToast,
} from "@heroui/react";
import {
  Camera,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { API_BASE, PUBLIC_TELEGRAM_BOT_NAME } from "@/config/env";
import { loadUser, logout } from "@/features/auth/store/authStore";
import { useTelegramLinkWidget } from "@/features/auth/hooks/useTelegramLinkWidget";
import { api, getApiErrorMessage } from "@/lib/api";
import { resolveImageUrl } from "@/lib/images";

type CustomerProfile = {
  id: number;
  role: string;
  firstName: string | null;
  avatarUrl: string | null;
  loginUsername: string | null;
  telegramUsername: string | null;
  hasTelegram: boolean;
};

const LOGIN_USERNAME_RE = /^@?[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export default function DashboardSettings({ title }: { title: string }) {
  const queryClient = useQueryClient();
  const lastProfileErrorRef = useRef<string | null>(null);
  const syncRef = useRef<{
    firstName: string;
    avatarUrl: string;
    loginUsername: string;
  } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loginUsername, setLoginUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: async ({ signal }) => {
      const response = await api.get<CustomerProfile>("/users/me", { signal });
      return response.data;
    },
    staleTime: 15_000,
    retry: 1,
  });

  useEffect(() => {
    if (!profileQuery.error) {
      lastProfileErrorRef.current = null;
      return;
    }
    const message = getApiErrorMessage(profileQuery.error);
    if (message === lastProfileErrorRef.current) return;
    lastProfileErrorRef.current = message;
    addToast({
      title: "Settings unavailable",
      description: message,
      color: "danger",
    });
  }, [profileQuery.error]);

  useEffect(() => {
    if (!profileQuery.data) return;
    const serverFirstName = profileQuery.data.firstName ?? "";
    const serverAvatarUrl = profileQuery.data.avatarUrl ?? "";
    const serverLoginUsername =
      profileQuery.data.loginUsername ?? profileQuery.data.telegramUsername ?? "";

    const last = syncRef.current;
    if (!last) {
      setFirstName(serverFirstName);
      setAvatarUrl(serverAvatarUrl);
      setLoginUsername(serverLoginUsername);
      syncRef.current = {
        firstName: serverFirstName,
        avatarUrl: serverAvatarUrl,
        loginUsername: serverLoginUsername,
      };
      return;
    }

    setFirstName((value) =>
      value === last.firstName ? serverFirstName : value
    );
    setAvatarUrl((value) =>
      avatarFile
        ? value
        : value === last.avatarUrl
          ? serverAvatarUrl
          : value
    );
    setLoginUsername((value) =>
      value === last.loginUsername ? serverLoginUsername : value
    );
    syncRef.current = {
      firstName: serverFirstName,
      avatarUrl: serverAvatarUrl,
      loginUsername: serverLoginUsername,
    };
  }, [avatarFile, profileQuery.data]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [avatarFile]);

  const avatarDisplay = useMemo(
    () =>
      avatarPreview ??
      resolveImageUrl(API_BASE, avatarUrl.trim() || null),
    [avatarPreview, avatarUrl]
  );

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { firstName: string }) => {
      const response = await api.patch("/users/me", payload);
      return response.data;
    },
    onSuccess: async () => {
      addToast({
        title: "Profile updated",
        description: "Your changes have been saved.",
        color: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      await loadUser({ force: true });
    },
    onError: (error) => {
      addToast({
        title: "Update failed",
        description: getApiErrorMessage(error),
        color: "danger",
      });
    },
  });

  const hasExistingPassword = Boolean(profileQuery.data?.loginUsername);
  const needsLoginUsername = Boolean(
    profileQuery.data &&
      !profileQuery.data.loginUsername &&
      !profileQuery.data.telegramUsername?.trim()
  );

  const usernameTrimmed = loginUsername.trim();
  const usernameMeetsFormat =
    usernameTrimmed.length >= 3 &&
    usernameTrimmed.length <= 32 &&
    LOGIN_USERNAME_RE.test(usernameTrimmed);
  const usernameLooksValid = needsLoginUsername
    ? usernameMeetsFormat
    : usernameTrimmed.length === 0 || usernameMeetsFormat;

  const canSubmitPassword =
    usernameLooksValid &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword &&
    (!hasExistingPassword || currentPassword.length >= 8);

  const setPasswordMutation = useMutation({
    mutationFn: async (payload: {
      username?: string;
      currentPassword?: string;
      newPassword: string;
    }) => {
      const response = await api.post("/auth/password/set", payload);
      return response.data;
    },
    onSuccess: async () => {
      addToast({
        title: "Password saved",
        description: "You can now sign in with your username and password.",
        color: "success",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      await loadUser({ force: true });
    },
    onError: (error) => {
      addToast({
        title: "Password update failed",
        description: getApiErrorMessage(error),
        color: "danger",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSettled: () => {
      void logout();
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as CustomerProfile;
    },
    onSuccess: async (payload) => {
      setAvatarFile(null);
      setAvatarUrl(payload.avatarUrl ?? "");
      addToast({
        title: "Avatar updated",
        description: "Your new photo is saved.",
        color: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      await loadUser({ force: true });
    },
    onError: (error) => {
      addToast({
        title: "Upload failed",
        description: getApiErrorMessage(error),
        color: "danger",
      });
    },
  });

  const handleAvatarPick = useCallback(() => {
    avatarInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        addToast({
          title: "Invalid file",
          description: "Please choose an image file.",
          color: "warning",
        });
        return;
      }
      setAvatarFile(file);
      uploadAvatarMutation.mutate(file);
      event.target.value = "";
    },
    [uploadAvatarMutation]
  );

  const handleTelegramLinked = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    await loadUser({ force: true });
  }, [queryClient]);

  const { status: telegramStatus, containerRef, retry: retryTelegram } =
    useTelegramLinkWidget({
      telegramBot: PUBLIC_TELEGRAM_BOT_NAME,
      enabled: Boolean(profileQuery.data && !profileQuery.data.hasTelegram),
      onLinked: handleTelegramLinked,
    });

  const isLoading = profileQuery.isPending && !profileQuery.data;
  const profile = profileQuery.data ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
              {title}
            </p>
            <p className="font-display mt-2 text-2xl">Customer settings</p>
            <p className="mt-2 text-sm text-ink-muted">
              Update your profile, manage security, and connect accounts.
            </p>
          </div>

          <Button
            radius="full"
            variant="flat"
            color="danger"
            isLoading={logoutMutation.isPending}
            onPress={async () => {
              const serverOk = await logoutMutation
                .mutateAsync()
                .then(() => true)
                .catch((error) => {
                  addToast({
                    title: "Logout warning",
                    description: getApiErrorMessage(error),
                    color: "warning",
                  });
                  return false;
                });

              addToast({
                title: "Logged out",
                description: serverOk
                  ? "You have been signed out successfully."
                  : "Signed out locally. Please retry if this persists.",
                color: "success",
              });
              window.location.replace("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-black/5 bg-white/80 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          <CardBody className="space-y-5 p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                Profile
              </p>
              <h3 className="font-display mt-2 text-xl">Basics</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Keep your name and avatar up to date.
              </p>
            </div>

            <Divider className="bg-black/5" />

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-black/5">
                    {avatarDisplay ? (
                      <img
                        src={avatarDisplay}
                        alt={firstName || "Avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {profile?.loginUsername
                        ? `@${profile.loginUsername.replace(/^@/, "")}`
                        : profile?.telegramUsername
                          ? `@${profile.telegramUsername.replace(/^@/, "")}`
                          : "Account"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      User ID: {profile?.id ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <Input
                    label="Full name"
                    value={firstName}
                    onValueChange={setFirstName}
                    placeholder="Abebe Bekele"
                    startContent={<User size={16} />}
                    radius="lg"
                    variant="bordered"
                    className="md:flex-1"
                  />
                  <Button
                    radius="full"
                    color="primary"
                    isDisabled={!profile}
                    isLoading={updateProfileMutation.isPending}
                    onPress={() =>
                      updateProfileMutation.mutate({
                        firstName: firstName.trim(),
                      })
                    }
                  >
                    Save
                  </Button>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                <div className="flex flex-col gap-2">
                  <Button
                    radius="full"
                    variant="flat"
                    onPress={handleAvatarPick}
                    isDisabled={uploadAvatarMutation.isPending}
                    startContent={<Camera size={16} />}
                  >
                    Choose avatar
                  </Button>
                  <p className="text-xs text-ink-muted">
                    PNG or JPG, square images work best.
                  </p>
                </div>

                <Divider className="bg-black/5" />

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                        Telegram
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        Link Telegram to enable one-tap sign in.
                      </p>
                    </div>
                  </div>

                  {isLoading ? (
                    <Skeleton className="h-24 rounded-2xl" />
                  ) : profile?.hasTelegram ? (
                    <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">Telegram linked</p>
                        <p className="text-xs opacity-80">
                          {profile.telegramUsername
                            ? `Connected as @${profile.telegramUsername.replace(/^@/, "")}`
                            : "Connected"}
                        </p>
                      </div>
                      <p className="text-xs opacity-80">
                        You can log in with Telegram.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {telegramStatus === "disabled" ? (
                        <div className="rounded-2xl border border-black/5 bg-black/5 px-4 py-3 text-sm text-ink-muted">
                          Telegram linking isn’t configured for this storefront.
                        </div>
                      ) : telegramStatus === "loading" ? (
                        <div className="space-y-3">
                          <Skeleton className="h-12 rounded-2xl" />
                          <Skeleton className="h-10 rounded-2xl" />
                        </div>
                      ) : telegramStatus === "error" ? (
                        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">Telegram unavailable</p>
                            <p className="text-xs opacity-80">
                              We couldn’t load the Telegram widget.
                            </p>
                          </div>
                          <Button
                            radius="full"
                            variant="flat"
                            onPress={retryTelegram}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : null}

                      <div
                        ref={containerRef}
                        className="flex min-h-12 items-center justify-center"
                      />
                      <p className="text-xs text-ink-muted">
                        By linking Telegram, your profile name and avatar may
                        update to match your Telegram account.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="border border-black/5 bg-white/80 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          <CardBody className="space-y-5 p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                Security
              </p>
              <h3 className="font-display mt-2 text-xl">Password login</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Set a password to sign in without Telegram.
              </p>
            </div>

            <Divider className="bg-black/5" />

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Login username"
                  value={loginUsername}
                  onValueChange={setLoginUsername}
                  placeholder="@abebe"
                  description='3–32 chars. Letters, numbers, ".", "_", "-" (optional "@").'
                  startContent={<UserRound size={16} />}
                  radius="lg"
                  variant="bordered"
                  isInvalid={!usernameLooksValid}
                />

                {hasExistingPassword ? (
                  <Input
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onValueChange={setCurrentPassword}
                    placeholder="********"
                    startContent={<Lock size={16} />}
                    radius="lg"
                    variant="bordered"
                  />
                ) : (
                  <div className="rounded-2xl border border-black/5 bg-black/5 px-4 py-3 text-xs text-ink-muted">
                    If you already have a password set, you’ll be asked for your
                    current password.
                  </div>
                )}

                <Input
                  label="New password"
                  type="password"
                  value={newPassword}
                  onValueChange={setNewPassword}
                  placeholder="********"
                  startContent={<KeyRound size={16} />}
                  radius="lg"
                  variant="bordered"
                />

                <Input
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  placeholder="********"
                  startContent={<ShieldCheck size={16} />}
                  radius="lg"
                  variant="bordered"
                  isInvalid={confirmPassword.length > 0 && confirmPassword !== newPassword}
                />

                <Button
                  radius="full"
                  color="primary"
                  isDisabled={!canSubmitPassword}
                  isLoading={setPasswordMutation.isPending}
                  onPress={() => {
                    if (!canSubmitPassword || setPasswordMutation.isPending)
                      return;

                    setPasswordMutation.mutate({
                      username: usernameTrimmed ? usernameTrimmed : undefined,
                      currentPassword:
                        currentPassword.trim().length > 0
                          ? currentPassword
                          : undefined,
                      newPassword,
                    });
                  }}
                >
                  Save password
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

    </div>
  );
}
