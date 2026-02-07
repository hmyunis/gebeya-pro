import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  addToast,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import {
  Archive,
  ArchiveBoxIcon,
  CheckCircle,
  IdentificationCard,
  MapPin,
  PencilSimple,
  Phone,
  UserCircle,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { getImageUrl, type MerchantUser } from "../../types";

interface MerchantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  merchant: MerchantUser | null;
  onArchiveToggle: (merchantId: number, archived: boolean) => void;
  isArchiveUpdating: boolean;
}

export default function MerchantEditModal({
  isOpen,
  onClose,
  onUpdated,
  merchant,
  onArchiveToggle,
  isArchiveUpdating,
}: MerchantEditModalProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [itemTypesRaw, setItemTypesRaw] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!merchant) return;
    setFullName(merchant.firstName ?? "");
    setPhoneNumber(merchant.merchantProfile?.phoneNumber ?? "");
    setItemTypesRaw((merchant.merchantProfile?.itemTypes ?? []).join(", "));
    setAddress(merchant.merchantProfile?.address ?? "");
    setTelegramId(merchant.telegramId ?? "");
    setTelegramUsername(merchant.username ?? "");
    setProfilePicture(null);
    setProfilePreview(null);
  }, [merchant]);

  const parsedItemTypes = useMemo(
    () =>
      itemTypesRaw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [itemTypesRaw],
  );

  const existingAvatarSrc = useMemo(
    () => (merchant?.avatarUrl ? getImageUrl(merchant.avatarUrl) : undefined),
    [merchant?.avatarUrl],
  );

  useEffect(() => {
    if (!profilePicture) {
      setProfilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(profilePicture);
    setProfilePreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profilePicture]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!merchant) throw new Error("Merchant not selected");

      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("phoneNumber", phoneNumber.trim());
      formData.append("itemTypes", JSON.stringify(parsedItemTypes));
      formData.append("address", address.trim());
      formData.append("telegramId", telegramId.trim());
      formData.append("telegramUsername", telegramUsername.trim());
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }
      return api.patch(`/merchants/${merchant.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      addToast({
        title: "Merchant updated",
        description: "Merchant details were updated successfully.",
        color: "success",
      });
      onUpdated();
      onClose();
    },
    onError: (error: any) => {
      addToast({
        title: "Update failed",
        description: error?.response?.data?.message || "Could not update merchant.",
        color: "danger",
      });
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <PencilSimple className="h-5 w-5 text-primary" />
          <span>Edit Merchant</span>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label="Full name"
            value={fullName}
            onValueChange={setFullName}
            startContent={<UserCircle className="h-4 w-4 text-default-400" />}
            isRequired
          />
          <Input
            label="Phone number"
            value={phoneNumber}
            onValueChange={setPhoneNumber}
            startContent={<Phone className="h-4 w-4 text-default-400" />}
            isRequired
          />
          <Input
            label="Item types"
            description="Comma separated values"
            value={itemTypesRaw}
            onValueChange={setItemTypesRaw}
            isRequired
          />
          <Textarea
            label="Address"
            value={address}
            onValueChange={setAddress}
            minRows={3}
            startContent={<MapPin className="h-4 w-4 text-default-400" />}
            isRequired
          />
          <Input
            label="Telegram ID"
            value={telegramId}
            onValueChange={setTelegramId}
            description="Leave empty to unlink Telegram ID."
            startContent={<IdentificationCard className="h-4 w-4 text-default-400" />}
          />
          <Input
            label="Telegram username"
            value={telegramUsername}
            onValueChange={setTelegramUsername}
            description="Leave empty to clear Telegram username."
          />
          <div className="flex items-center gap-3">
            <Avatar
              src={profilePreview ?? existingAvatarSrc}
              name={fullName || merchant?.firstName || "M"}
              size="md"
              className="shrink-0"
            />
            <Input
              type="file"
              label="New profile picture (optional)"
              accept="image/*"
              className="flex-1"
              onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="rounded-lg border border-default-200 bg-default-50/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Archive status</p>
                <p className="text-xs text-default-500">
                  Archived merchants cannot access their dashboard.
                </p>
              </div>
              <Chip
                size="sm"
                variant="flat"
                color={merchant?.isBanned ? "warning" : "success"}
              >
                {merchant?.isBanned ? "Archived" : "Active"}
              </Chip>
            </div>
            <Button
              className="mt-3"
              size="sm"
              variant="flat"
              color={merchant?.isBanned ? "success" : "warning"}
              startContent={
                merchant?.isBanned ? (
                  <ArchiveBoxIcon className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )
              }
              isDisabled={!merchant}
              isLoading={isArchiveUpdating}
              onPress={() => {
                if (!merchant) return;
                onArchiveToggle(merchant.id, !merchant.isBanned);
              }}
            >
              {merchant?.isBanned ? "Unarchive Merchant" : "Archive Merchant"}
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} startContent={<XCircle className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            color="primary"
            isLoading={mutation.isPending}
            onPress={() => mutation.mutate()}
            startContent={<CheckCircle className="h-4 w-4" />}
            isDisabled={
              !merchant ||
              !fullName.trim() ||
              !phoneNumber.trim() ||
              !address.trim() ||
              parsedItemTypes.length === 0
            }
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
