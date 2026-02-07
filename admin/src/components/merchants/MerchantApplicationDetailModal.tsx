import {
  Button,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
  Switch,
  Textarea,
  addToast,
} from "@heroui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle,
  Eye,
  XCircle,
  FileText,
  UserCircle,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { MerchantApplication } from "../../types";
import { getImageUrl } from "../../types";

type ApproveResponse = {
  application: MerchantApplication;
  credentials?: {
    username: string;
    password: string;
  };
  botDelivery?: {
    attempted: boolean;
    sent: boolean;
    error?: string;
  };
};

const statusColor: Record<string, "default" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default function MerchantApplicationDetailModal({
  isOpen,
  onClose,
  applicationId,
  onChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number | null;
  onChanged: () => void;
}) {
  const [createAccount, setCreateAccount] = useState(true);
  const [reviewNote, setReviewNote] = useState("");

  const detailQuery = useQuery({
    queryKey: ["merchant-application", applicationId],
    queryFn: async () =>
      (await api.get<MerchantApplication>(`/merchants/applications/${applicationId}`)).data,
    enabled: isOpen && Boolean(applicationId),
  });

  const application = detailQuery.data;
  const profileImage = useMemo(
    () =>
      application?.profilePictureUrl ? getImageUrl(application.profilePictureUrl) : null,
    [application?.profilePictureUrl],
  );

  const approveMutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch<ApproveResponse>(
          `/merchants/applications/${applicationId}/approve`,
          {
            createAccount,
            reviewNote: reviewNote.trim() || undefined,
          },
        )
      ).data,
    onSuccess: (payload) => {
      const botDelivery = payload.botDelivery;
      const credentials = payload.credentials;

      addToast({
        title: "Application approved",
        description: botDelivery?.attempted
          ? botDelivery.sent
            ? "Credentials sent via Telegram."
            : "Approved, but Telegram credential delivery failed."
          : "Approved successfully.",
        color: botDelivery?.attempted && !botDelivery.sent ? "warning" : "success",
      });

      if (credentials && (!botDelivery || !botDelivery.sent)) {
        addToast({
          title: "Credentials",
          description: `Username: ${credentials.username} | Password: ${credentials.password}`,
          color: "default",
        });
      }

      onChanged();
      onClose();
    },
    onError: (error: any) => {
      addToast({
        title: "Approval failed",
        description: error?.response?.data?.message || "Could not approve application.",
        color: "danger",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/merchants/applications/${applicationId}/reject`, {
        reviewNote: reviewNote.trim() || undefined,
      }),
    onSuccess: () => {
      addToast({
        title: "Application rejected",
        description: "The application has been rejected.",
        color: "success",
      });
      onChanged();
      onClose();
    },
    onError: (error: any) => {
      addToast({
        title: "Reject failed",
        description: error?.response?.data?.message || "Could not reject application.",
        color: "danger",
      });
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span>Merchant Application</span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {detailQuery.isLoading || !application ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">{application.fullName}</p>
                  <p className="text-xs text-default-500">
                    Applied {new Date(application.createdAt).toLocaleString()}
                  </p>
                </div>
                <Chip color={statusColor[application.status] ?? "default"} variant="flat">
                  {application.status}
                </Chip>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase text-default-500">Phone</p>
                    <p>{application.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-default-500">Item Types</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {application.itemTypes.map((itemType) => (
                        <Chip key={itemType} size="sm" variant="flat">
                          {itemType}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-default-500">Address</p>
                    <p>{application.address}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-default-500">Telegram</p>
                    <p>
                      {application.telegramFirstName || "Unknown"}{" "}
                      {application.telegramUsername
                        ? `(@${application.telegramUsername})`
                        : ""}
                    </p>
                    <p className="text-xs text-default-500">ID: {application.telegramId}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-default-200 bg-default-50 p-2">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={application.fullName}
                      className="h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-default-100 text-sm text-default-500">
                      <UserCircle className="mr-2 h-4 w-4" />
                      No image
                    </div>
                  )}
                </div>
              </div>

              <Divider />

              <Switch
                isSelected={createAccount}
                onValueChange={setCreateAccount}
                isDisabled={application.status !== "PENDING"}
              >
                Create account and send credentials
              </Switch>

              <Textarea
                label="Admin note (optional)"
                value={reviewNote}
                onValueChange={setReviewNote}
                minRows={2}
              />
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} startContent={<Eye className="h-4 w-4" />}>
            Close
          </Button>
          {application?.status === "PENDING" ? (
            <>
              <Button
                color="danger"
                variant="flat"
                onPress={() => rejectMutation.mutate()}
                isLoading={rejectMutation.isPending}
                startContent={<XCircle className="h-4 w-4" />}
              >
                Reject
              </Button>
              <Button
                color="primary"
                onPress={() => approveMutation.mutate()}
                isLoading={approveMutation.isPending}
                startContent={<CheckCircle className="h-4 w-4" />}
              >
                {createAccount ? "Create Account + Accept" : "Accept Application"}
              </Button>
            </>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
