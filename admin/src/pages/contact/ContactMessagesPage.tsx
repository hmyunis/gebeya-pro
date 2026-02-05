import { useMemo, useState } from 'react';
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Tab,
  Tabs,
} from '@heroui/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EnvelopeOpen, Eye, EyeSlash } from '@phosphor-icons/react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/table/DataTable';

type ContactMessage = {
  id: number;
  name: string;
  contact: string;
  message: string;
  isRead: boolean;
  readByUserId: number | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type MessageFilter = 'ALL' | 'UNREAD' | 'READ';

export default function ContactMessagesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MessageFilter>('UNREAD');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const { data, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ['contact-messages'],
    queryFn: async () => (await api.get('/contact/admin')).data,
  });

  const setReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: number; isRead: boolean }) =>
      api.patch(`/contact/${id}/read`, { isRead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
    },
  });

  const messages = data ?? [];
  const filteredMessages = useMemo(() => {
    if (filter === 'UNREAD') return messages.filter((msg) => !msg.isRead);
    if (filter === 'READ') return messages.filter((msg) => msg.isRead);
    return messages;
  }, [filter, messages]);

  const unreadCount = useMemo(
    () => messages.filter((msg) => !msg.isRead).length,
    [messages],
  );

  const columns = useMemo<ColumnDef<ContactMessage>[]>(
    () => [
      {
        header: '#',
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{row.index + 1}</p>
        ),
      },
      {
        header: 'SENDER',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <p className="text-sm font-semibold">{row.original.name}</p>
            <p className="text-xs text-default-400">{row.original.contact}</p>
          </div>
        ),
      },
      {
        header: 'MESSAGE',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-sm text-default-600 max-w-64 truncate text-left hover:text-default-800"
            onClick={() => setSelectedMessage(row.original)}
          >
            {row.original.message}
          </button>
        ),
      },
      {
        header: 'STATUS',
        cell: ({ row }) => (
          <Chip size="sm" variant="flat" color={row.original.isRead ? 'success' : 'warning'}>
            {row.original.isRead ? 'Read' : 'Unread'}
          </Chip>
        ),
      },
      {
        header: 'RECEIVED',
        cell: ({ row }) => (
          <span className="text-xs text-default-500">
            {new Date(row.original.createdAt).toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        header: 'ACTIONS',
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<Eye className="h-3.5 w-3.5" />}
              onPress={() => setSelectedMessage(row.original)}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="light"
              color={row.original.isRead ? 'warning' : 'success'}
              isLoading={setReadMutation.isPending}
              startContent={
                row.original.isRead ? (
                  <EyeSlash className="h-3.5 w-3.5" />
                ) : (
                  <EnvelopeOpen className="h-3.5 w-3.5" />
                )
              }
              onPress={() =>
                setReadMutation.mutate({ id: row.original.id, isRead: !row.original.isRead })
              }
            >
              {row.original.isRead ? 'Mark unread' : 'Mark read'}
            </Button>
          </div>
        ),
      },
    ],
    [setReadMutation],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Messages</h1>
          <p className="text-sm text-default-500">
            Incoming messages from the contact form.
          </p>
        </div>
        <Chip variant="flat" color={unreadCount > 0 ? 'warning' : 'default'}>
          {unreadCount} unread
        </Chip>
      </div>

      <Tabs
        aria-label="Message filters"
        selectedKey={filter}
        onSelectionChange={(key) => setFilter(key as MessageFilter)}
        size="sm"
        color="primary"
        variant="underlined"
      >
        <Tab key="ALL" title="All" />
        <Tab key="UNREAD" title="Unread" />
        <Tab key="READ" title="Read" />
      </Tabs>

      <DataTable columns={columns} data={filteredMessages} isLoading={isLoading} />

      <Modal
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        size="lg"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {selectedMessage?.name}
            <span className="text-xs text-default-400">{selectedMessage?.contact}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-700 whitespace-pre-wrap">
              {selectedMessage?.message}
            </p>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
