import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Chip,
  Switch,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { BankAccount, BankAccountStatus } from "../../types";

const statusColorMap: Record<BankAccountStatus, "success" | "default"> = {
  ACTIVE: "success",
  INACTIVE: "default",
};

const emptyForm = {
  bankName: "",
  logoUrl: "",
  accountHolderName: "",
  accountNumber: "",
  status: "ACTIVE" as BankAccountStatus,
};

export default function BankAccountsPage() {
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);

  const { data, isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: async () => (await api.get("/bank-accounts/manage")).data,
  });

  const accounts = useMemo(() => data ?? [], [data]);

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        bankName: form.bankName.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        status: form.status,
      };
      if (editing) {
        return api.patch(`/bank-accounts/${editing.id}`, payload);
      }
      return api.post("/bank-accounts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      addToast({
        title: editing ? "Bank Account Updated" : "Bank Account Created",
        description: "Changes saved successfully.",
        color: "success",
      });
      onClose();
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || "Failed to save bank account.",
        color: "danger",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      addToast({
        title: "Bank Account Removed",
        description: "The bank account has been deleted.",
        color: "success",
      });
      onDeleteClose();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete bank account.",
        color: "danger",
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    onOpen();
  };

  const openEdit = (account: BankAccount) => {
    setEditing(account);
    setForm({
      bankName: account.bankName,
      logoUrl: account.logoUrl ?? "",
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      status: account.status,
    });
    onOpen();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bank Accounts</h1>
          <p className="text-sm text-default-500">
            Manage bank details displayed at checkout.
          </p>
        </div>
        <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={openCreate}>
          Add bank
        </Button>
      </div>

      <Card shadow="sm" className="border border-default-200">
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-default-500">Loading bank accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="p-6 text-sm text-default-500">No bank accounts yet.</div>
          ) : (
            <div className="divide-y divide-default-200">
              {accounts.map((account) => (
                <div key={account.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-55">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-default-200 bg-default-50">
                      {account.logoUrl ? (
                        <img
                          src={account.logoUrl}
                          alt={account.bankName}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold">{account.bankName}</p>
                      <p className="text-xs text-default-500">
                        {account.accountHolderName}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-50">
                    <p className="text-sm font-medium">{account.accountNumber}</p>
                    <p className="text-xs text-default-500">Account number</p>
                  </div>

                  <Chip size="sm" variant="flat" color={statusColorMap[account.status]}>
                    {account.status}
                  </Chip>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<PencilSimple className="h-3.5 w-3.5" />}
                      onPress={() => openEdit(account)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      startContent={<Trash className="h-3.5 w-3.5" />}
                      onPress={() => {
                        setDeleteTarget(account);
                        onDeleteOpen();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {editing ? "Edit bank account" : "Add bank account"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Bank name"
                value={form.bankName}
                onValueChange={(value) => setForm((prev) => ({ ...prev, bankName: value }))}
                isRequired
              />
              <Input
                label="Logo URL"
                placeholder="https://..."
                value={form.logoUrl}
                onValueChange={(value) => setForm((prev) => ({ ...prev, logoUrl: value }))}
              />
              <Input
                label="Account holder name"
                value={form.accountHolderName}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, accountHolderName: value }))
                }
                isRequired
              />
              <Input
                label="Account number"
                value={form.accountNumber}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, accountNumber: value }))
                }
                isRequired
              />
              <Switch
                isSelected={form.status === "ACTIVE"}
                onValueChange={(isSelected) =>
                  setForm((prev) => ({
                    ...prev,
                    status: (isSelected ? "ACTIVE" : "INACTIVE") as BankAccountStatus,
                  }))
                }
              >
                Active
              </Switch>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={createOrUpdateMutation.isPending}
              onPress={() => createOrUpdateMutation.mutate()}
              isDisabled={
                !form.bankName.trim() ||
                !form.accountHolderName.trim() ||
                !form.accountNumber.trim()
              }
            >
              {editing ? "Save changes" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="md">
        <ModalContent>
          <ModalHeader>Delete bank account</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget?.bankName}</span>?
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={deleteMutation.isPending}
              onPress={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
