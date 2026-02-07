import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, Key, UserCircle, UserPlus, XCircle } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { CreateCustomerResponse } from "../../types";

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payload: CreateCustomerResponse) => void;
}

function getErrorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  return "Could not create customer account.";
}

export default function CustomerCreateModal({
  isOpen,
  onClose,
  onCreated,
}: CustomerCreateModalProps) {
  const [firstName, setFirstName] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFirstName("");
    setLoginUsername("");
    setPassword("");
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<CreateCustomerResponse>("/admin/customers", {
          firstName: firstName.trim(),
          loginUsername: loginUsername.trim() || undefined,
          password: password.trim() || undefined,
        })
      ).data,
    onSuccess: (payload) => {
      addToast({
        title: "Customer created",
        description: "Credentials are ready to share.",
        color: "success",
      });
      onCreated(payload);
      onClose();
    },
    onError: (error: unknown) => {
      addToast({
        title: "Create failed",
        description: getErrorMessage(error),
        color: "danger",
      });
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <span>Create Customer Account</span>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label="Customer name"
            value={firstName}
            onValueChange={setFirstName}
            isRequired
            maxLength={140}
            startContent={<UserCircle className="h-4 w-4 text-default-400" />}
          />
          <Input
            label="Username (optional)"
            value={loginUsername}
            onValueChange={setLoginUsername}
            maxLength={32}
            description="Leave empty to auto-generate a unique username."
          />
          <Input
            label="Password (optional)"
            value={password}
            onValueChange={setPassword}
            type="text"
            maxLength={128}
            description="Leave empty to auto-generate a secure password."
            startContent={<Key className="h-4 w-4 text-default-400" />}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} startContent={<XCircle className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            isDisabled={!firstName.trim()}
            startContent={<CheckCircle className="h-4 w-4" />}
          >
            Create Customer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
