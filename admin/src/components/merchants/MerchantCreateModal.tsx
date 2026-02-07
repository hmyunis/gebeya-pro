import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
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
  CheckCircle,
  IdentificationCard,
  MapPin,
  Phone,
  PlusCircle,
  UserCircle,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";

type CreateMerchantResponse = {
  merchant?: {
    id: number;
    firstName: string;
  };
  generatedCredentials?: {
    username: string;
    password: string;
  };
  botDelivery?: {
    attempted: boolean;
    sent: boolean;
    error?: string;
  };
};

export default function MerchantCreateModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [itemTypesRaw, setItemTypesRaw] = useState("");
  const [address, setAddress] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const parsedItemTypes = useMemo(
    () =>
      itemTypesRaw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [itemTypesRaw],
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
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("phoneNumber", phoneNumber.trim());
      formData.append("itemTypes", JSON.stringify(parsedItemTypes));
      formData.append("address", address.trim());
      if (loginUsername.trim()) {
        formData.append("loginUsername", loginUsername.trim());
      }
      if (password.trim()) {
        formData.append("password", password.trim());
      }
      if (telegramId.trim()) {
        formData.append("telegramId", telegramId.trim());
      }
      if (telegramUsername.trim()) {
        formData.append("telegramUsername", telegramUsername.trim());
      }
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

      return api.post<CreateMerchantResponse>("/merchants", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: (response) => {
      const payload = response.data;
      const botDelivery = payload.botDelivery;
      const credentials = payload.generatedCredentials;

      addToast({
        title: "Merchant created",
        description: botDelivery?.attempted
          ? botDelivery.sent
            ? "Credentials were sent via Telegram."
            : "Merchant created, but Telegram delivery failed."
          : "Merchant created successfully.",
        color: botDelivery?.attempted && !botDelivery.sent ? "warning" : "success",
      });

      if (credentials && (!botDelivery || !botDelivery.sent)) {
        addToast({
          title: "Generated credentials",
          description: `Username: ${credentials.username} | Password: ${credentials.password}`,
          color: "default",
        });
      }

      onCreated();
      onClose();
      setFullName("");
      setPhoneNumber("");
      setItemTypesRaw("");
      setAddress("");
      setLoginUsername("");
      setPassword("");
      setTelegramId("");
      setTelegramUsername("");
      setProfilePicture(null);
    },
    onError: (error: any) => {
      addToast({
        title: "Create failed",
        description: error?.response?.data?.message || "Could not create merchant.",
        color: "danger",
      });
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <span>Create Merchant Account</span>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label="Full name"
            value={fullName}
            onValueChange={setFullName}
            isRequired
            startContent={<UserCircle className="h-4 w-4 text-default-400" />}
          />
          <Input
            label="Phone number"
            value={phoneNumber}
            onValueChange={setPhoneNumber}
            isRequired
            startContent={<Phone className="h-4 w-4 text-default-400" />}
          />
          <Input
            label="Item types"
            description="Comma separated values"
            value={itemTypesRaw}
            onValueChange={setItemTypesRaw}
            placeholder="Electronics, Shoes, Home Decor"
            isRequired
          />
          <Textarea
            label="Address"
            value={address}
            onValueChange={setAddress}
            minRows={3}
            isRequired
            startContent={<MapPin className="h-4 w-4 text-default-400" />}
          />
          <Input
            label="Login username (optional)"
            value={loginUsername}
            onValueChange={setLoginUsername}
          />
          <Input
            label="Password (optional)"
            type="text"
            value={password}
            onValueChange={setPassword}
            description="Leave empty to auto-generate."
          />
          <Input
            label="Telegram ID (optional)"
            value={telegramId}
            onValueChange={setTelegramId}
            description="If provided, credentials can be sent via bot."
            startContent={<IdentificationCard className="h-4 w-4 text-default-400" />}
          />
          <Input
            label="Telegram username (optional)"
            value={telegramUsername}
            onValueChange={setTelegramUsername}
          />
          <div className="flex items-center gap-3">
            <Avatar
              src={profilePreview ?? undefined}
              name={fullName || "M"}
              size="md"
              className="shrink-0"
            />
            <Input
              type="file"
              label="Profile picture (optional)"
              accept="image/*"
              className="flex-1"
              onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} startContent={<XCircle className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => mutation.mutate()}
            isLoading={mutation.isPending}
            startContent={<CheckCircle className="h-4 w-4" />}
            isDisabled={
              !fullName.trim() ||
              !phoneNumber.trim() ||
              parsedItemTypes.length === 0 ||
              !address.trim()
            }
          >
            Create Merchant
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
