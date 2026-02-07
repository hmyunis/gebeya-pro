import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  addToast,
  useDisclosure,
} from "@heroui/react";
import {
  Eye,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  PhoneCall,
  Trash,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type {
  MerchantApplication,
  MerchantApplicationStatus,
  MerchantUser,
  PaginatedResponse,
} from "../../types";
import { getImageUrl } from "../../types";
import { DataTable } from "../../components/table/DataTable";
import { DataTablePagination } from "../../components/table/DataTablePagination";
import MerchantCreateModal from "../../components/merchants/MerchantCreateModal";
import MerchantApplicationDetailModal from "../../components/merchants/MerchantApplicationDetailModal";
import MerchantEditModal from "../../components/merchants/MerchantEditModal";

type TabKey = "merchants" | "applications";

const applicationStatusColor: Record<
  MerchantApplicationStatus,
  "default" | "warning" | "success" | "danger"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default function MerchantsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("merchants");
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantPage, setMerchantPage] = useState(1);
  const [merchantLimit, setMerchantLimit] = useState(10);
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">(
    "active",
  );
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsLimit, setApplicationsLimit] = useState(10);
  const [applicationStatus, setApplicationStatus] =
    useState<MerchantApplicationStatus | "ALL">("PENDING");
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MerchantUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const applicationModal = useDisclosure();

  useEffect(() => {
    setMerchantPage(1);
  }, [merchantSearch]);

  useEffect(() => {
    setApplicationsPage(1);
  }, [applicationStatus]);

  const merchantsQuery = useQuery<PaginatedResponse<MerchantUser>>({
    queryKey: ["merchants", archiveFilter, merchantSearch, merchantPage, merchantLimit],
    queryFn: async () =>
      (
        await api.get("/merchants", {
          params: {
            archive: archiveFilter,
            search: merchantSearch.trim() || undefined,
            page: merchantPage,
            limit: merchantLimit,
          },
        })
      ).data,
    enabled: activeTab === "merchants",
  });

  const applicationsQuery = useQuery<PaginatedResponse<MerchantApplication>>({
    queryKey: [
      "merchant-applications",
      applicationStatus,
      applicationsPage,
      applicationsLimit,
    ],
    queryFn: async () =>
      (
        await api.get("/merchants/applications", {
          params: {
            status: applicationStatus === "ALL" ? undefined : applicationStatus,
            page: applicationsPage,
            limit: applicationsLimit,
          },
        })
      ).data,
    enabled: activeTab === "applications",
    refetchInterval: activeTab === "applications" ? 5000 : false,
    staleTime: 4000,
  });

  const pendingCountQuery = useQuery<{ count: number }>({
    queryKey: ["merchant-applications", "pending-count"],
    queryFn: async () => (await api.get("/merchants/applications/pending-count")).data,
    refetchInterval: activeTab === "applications" ? 5000 : false,
    staleTime: 4000,
  });

  const merchants = merchantsQuery.data?.data ?? [];
  const merchantsMeta = merchantsQuery.data?.meta;
  const merchantsTotalPages = Math.max(1, merchantsMeta?.totalPages ?? 1);
  const merchantsOffset =
    ((merchantsMeta?.page ?? merchantPage) - 1) *
    (merchantsMeta?.limit ?? merchantLimit);

  const applications = applicationsQuery.data?.data ?? [];
  const applicationsMeta = applicationsQuery.data?.meta;
  const applicationsTotalPages = Math.max(1, applicationsMeta?.totalPages ?? 1);
  const applicationsOffset =
    ((applicationsMeta?.page ?? applicationsPage) - 1) *
    (applicationsMeta?.limit ?? applicationsLimit);

  const deleteMerchantMutation = useMutation({
    mutationFn: async (merchantId: number) => api.delete(`/merchants/${merchantId}`),
    onSuccess: () => {
      addToast({
        title: "Merchant deleted",
        description: "Merchant account has been deleted.",
        color: "success",
      });
      setDeleteTarget(null);
      setDeleteError(null);
      void refreshAfterMutations();
    },
    onError: (error: any) => {
      const serverMessage = error?.response?.data?.message;
      const message =
        (Array.isArray(serverMessage) ? serverMessage.join(", ") : serverMessage) ||
        "Merchant cannot be deleted because it has order references.";
      setDeleteError(message);
      addToast({
        title: "Delete blocked",
        description: message,
        color: "danger",
      });
    },
  });

  const archiveMerchantMutation = useMutation({
    mutationFn: async ({ merchantId, archived }: { merchantId: number; archived: boolean }) =>
      api.patch(`/merchants/${merchantId}/archive`, { archived }),
    onSuccess: (_response, variables) => {
      addToast({
        title: variables.archived ? "Merchant archived" : "Merchant unarchived",
        description: variables.archived
          ? "Merchant account is archived and access is disabled."
          : "Merchant account is active again.",
        color: "success",
      });
      setSelectedMerchant((previous) =>
        previous && previous.id === variables.merchantId
          ? { ...previous, isBanned: variables.archived }
          : previous,
      );
      setDeleteTarget((previous) =>
        previous && previous.id === variables.merchantId
          ? { ...previous, isBanned: variables.archived }
          : previous,
      );
      setDeleteError(null);
      void refreshAfterMutations();
    },
    onError: (error: any) => {
      addToast({
        title: "Archive update failed",
        description: error?.response?.data?.message || "Could not update archive status.",
        color: "danger",
      });
    },
  });

  const merchantColumns = useMemo<ColumnDef<MerchantUser>[]>(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{merchantsOffset + row.index + 1}</p>
        ),
      },
      {
        header: "Merchant",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar
              size="sm"
              src={row.original.avatarUrl ? getImageUrl(row.original.avatarUrl) : undefined}
              name={row.original.firstName || "M"}
            />
            <div className="flex flex-col">
              <span className="font-semibold">{row.original.firstName}</span>
              <span className="text-xs text-default-400">
                @{row.original.loginUsername || row.original.username || "no_username"}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Contact",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span className="text-sm text-foreground">
              {row.original.merchantProfile?.phoneNumber ?? "—"}
            </span>
            <span className="text-default-400">
              @{row.original.loginUsername || row.original.username || "no_username"}
            </span>
          </div>
        ),
      },
      {
        header: "State",
        cell: ({ row }) => (
          <Chip
            size="sm"
            variant="flat"
            color={row.original.isBanned ? "warning" : "success"}
          >
            {row.original.isBanned ? "Archived" : "Active"}
          </Chip>
        ),
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<PencilSimple className="h-3.5 w-3.5" />}
              onPress={() => {
                setSelectedMerchant(row.original);
                editModal.onOpen();
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              color="danger"
              variant="flat"
              startContent={<Trash className="h-3.5 w-3.5" />}
              onPress={() => {
                setDeleteError(null);
                setDeleteTarget(row.original);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [editModal, merchantsOffset],
  );

  const applicationColumns = useMemo<ColumnDef<MerchantApplication>[]>(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{applicationsOffset + row.index + 1}</p>
        ),
      },
      {
        header: "Applicant",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar
              size="sm"
              src={
                row.original.profilePictureUrl
                  ? getImageUrl(row.original.profilePictureUrl)
                  : row.original.telegramPhotoUrl
                    ? row.original.telegramPhotoUrl
                    : undefined
              }
              name={row.original.fullName || "A"}
            />
            <div className="flex flex-col">
              <span className="font-semibold">{row.original.fullName}</span>
              <span className="text-xs text-default-400">
                @{row.original.telegramUsername || "no_username"} · {row.original.phoneNumber}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Item Types",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.itemTypes.slice(0, 3).map((type) => (
              <Chip key={`${row.original.id}-${type}`} size="sm" variant="flat">
                {type}
              </Chip>
            ))}
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Chip color={applicationStatusColor[row.original.status]} variant="flat" size="sm">
            {row.original.status}
          </Chip>
        ),
      },
      {
        header: "Created",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
      },
      {
        header: "Action",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="flat"
            startContent={<Eye className="h-3.5 w-3.5" />}
            onPress={() => {
              setSelectedApplicationId(row.original.id);
              applicationModal.onOpen();
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [applicationModal, applicationsOffset],
  );

  const refreshAfterMutations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["merchants"] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-applications"] }),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Merchant Management</h1>
        {activeTab === "merchants" ? (
          <Button
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onPress={createModal.onOpen}
          >
            Create Merchant
          </Button>
        ) : null}
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key) as TabKey)}
        color="primary"
        variant="underlined"
      >
        <Tab key="merchants" title="Merchants">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input
                value={merchantSearch}
                onValueChange={setMerchantSearch}
                placeholder="Search merchants by name, username, phone, telegram id"
                startContent={<MagnifyingGlass className="h-4 w-4 text-default-400" />}
              />
              <Select
                label="Archive"
                selectedKeys={new Set([archiveFilter])}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  if (!value) return;
                  setArchiveFilter(value as "active" | "archived" | "all");
                  setMerchantPage(1);
                }}
              >
                <SelectItem key="active">Active only</SelectItem>
                <SelectItem key="archived">Archived only</SelectItem>
                <SelectItem key="all">All merchants</SelectItem>
              </Select>
            </div>

            <DataTable
              columns={merchantColumns}
              data={merchants}
              isLoading={merchantsQuery.isLoading}
            />

            <DataTablePagination
              pagination={{
                count: merchantsMeta?.total ?? 0,
                page: merchantsMeta?.page ?? merchantPage,
                pageSize: merchantsMeta?.limit ?? merchantLimit,
                totalPages: merchantsTotalPages,
              }}
              onPageChange={(page) =>
                setMerchantPage(Math.min(Math.max(1, page), merchantsTotalPages))
              }
              onPageSizeChange={(size) => {
                setMerchantLimit(size);
                setMerchantPage(1);
              }}
            />
          </div>
        </Tab>

        <Tab
          key="applications"
          title={
            <div className="flex items-center gap-2">
              <span>Applications</span>
              <Chip size="sm" variant="flat" color="warning">
                {pendingCountQuery.data?.count ?? 0}
              </Chip>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={applicationStatus === status ? "solid" : "flat"}
                  color={applicationStatus === status ? "primary" : "default"}
                  onPress={() => setApplicationStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>

            <DataTable
              columns={applicationColumns}
              data={applications}
              isLoading={applicationsQuery.isLoading}
            />

            <DataTablePagination
              pagination={{
                count: applicationsMeta?.total ?? 0,
                page: applicationsMeta?.page ?? applicationsPage,
                pageSize: applicationsMeta?.limit ?? applicationsLimit,
                totalPages: applicationsTotalPages,
              }}
              onPageChange={(page) =>
                setApplicationsPage(Math.min(Math.max(1, page), applicationsTotalPages))
              }
              onPageSizeChange={(size) => {
                setApplicationsLimit(size);
                setApplicationsPage(1);
              }}
            />
          </div>
        </Tab>
      </Tabs>

      <MerchantCreateModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        onCreated={() => {
          void refreshAfterMutations();
        }}
      />

      <MerchantApplicationDetailModal
        isOpen={applicationModal.isOpen}
        onClose={() => {
          applicationModal.onClose();
          setSelectedApplicationId(null);
        }}
        applicationId={selectedApplicationId}
        onChanged={() => {
          addToast({
            title: "Updated",
            description: "Merchant applications have been refreshed.",
            color: "success",
          });
          void refreshAfterMutations();
        }}
      />

      <MerchantEditModal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.onClose();
          setSelectedMerchant(null);
        }}
        merchant={selectedMerchant}
        onUpdated={() => {
          addToast({
            title: "Updated",
            description: "Merchant details have been refreshed.",
            color: "success",
          });
          void refreshAfterMutations();
        }}
        onArchiveToggle={(merchantId, archived) => {
          archiveMerchantMutation.mutate({ merchantId, archived });
        }}
        isArchiveUpdating={archiveMerchantMutation.isPending}
      />

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        size="2xl"
        classNames={{
          wrapper: "px-2 sm:px-4",
          base: "w-[calc(100%-1rem)] max-w-3xl",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <WarningCircle className="h-5 w-5 text-danger" />
            <span>Delete Merchant</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm leading-relaxed sm:text-base">
              {deleteTarget
                ? `Delete ${deleteTarget.firstName}? This is allowed only when the merchant has no order references.`
                : ""}
            </p>
            {deleteError ? (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                {deleteError}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="light"
              className="w-full sm:w-auto"
              onPress={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              startContent={<XCircle className="h-4 w-4" />}
            >
              Cancel
            </Button>
            {deleteTarget ? (
              <Button
                as="a"
                href={
                  deleteTarget.username
                    ? `https://t.me/${deleteTarget.username}`
                    : deleteTarget.merchantProfile?.phoneNumber
                      ? `tel:${deleteTarget.merchantProfile.phoneNumber}`
                      : "#"
                }
                target={deleteTarget.username ? "_blank" : undefined}
                rel={deleteTarget.username ? "noreferrer" : undefined}
                isDisabled={
                  !deleteTarget.username && !deleteTarget.merchantProfile?.phoneNumber
                }
                variant="flat"
                className="w-full sm:w-auto"
                startContent={<PhoneCall className="h-4 w-4" />}
              >
                Contact Merchant
              </Button>
            ) : null}
            {deleteTarget ? (
              <Button
                color="warning"
                variant="flat"
                className="w-full sm:w-auto"
                startContent={<WarningCircle className="h-4 w-4" />}
                onPress={() => {
                  archiveMerchantMutation.mutate({
                    merchantId: deleteTarget.id,
                    archived: true,
                  });
                }}
                isDisabled={deleteTarget.isBanned}
                isLoading={
                  archiveMerchantMutation.isPending &&
                  archiveMerchantMutation.variables?.merchantId === deleteTarget.id
                }
              >
                {deleteTarget.isBanned ? "Already Archived" : "Archive Merchant"}
              </Button>
            ) : null}
            <Button
              color="danger"
              className="w-full sm:w-auto"
              onPress={() => {
                if (!deleteTarget) return;
                deleteMerchantMutation.mutate(deleteTarget.id);
              }}
              startContent={<Trash className="h-4 w-4" />}
              isLoading={deleteMerchantMutation.isPending}
            >
              Delete Merchant
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
