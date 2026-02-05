import { useMemo, useState } from 'react';
import { Chip, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ActivityLog, PaginatedResponse } from '../../types';
import { DataTable } from '../../components/table/DataTable';
import { DataTablePagination } from '../../components/table/DataTablePagination';

const methodColorMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    GET: 'default',
    POST: 'primary',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'danger',
};

export default function ActivityLogsPage() {
    const [logsPage, setLogsPage] = useState(1);
    const [logsLimit, setLogsLimit] = useState(10);
    const [payloadModal, setPayloadModal] = useState<{
        isOpen: boolean;
        title: string;
        content: string;
    }>({ isOpen: false, title: '', content: '' });

    const { data: logsResponse, isLoading } = useQuery<PaginatedResponse<ActivityLog>>({
        queryKey: ['activity-logs', logsPage, logsLimit],
        queryFn: async () =>
            (
                await api.get('/admin/activity-logs', {
                    params: { page: logsPage, limit: logsLimit },
                })
            ).data,
    });

    const logs = logsResponse?.data ?? [];
    const logsMeta = logsResponse?.meta;
    const logsTotalPages = Math.max(1, logsMeta?.totalPages ?? 1);
    const logsOffset = ((logsMeta?.page ?? 1) - 1) * (logsMeta?.limit ?? logs.length);

    const columns = useMemo<ColumnDef<ActivityLog>[]>(
        () => [
            {
                header: '#',
                cell: ({ row }) => (
                    <p className="text-sm text-default-500">{logsOffset + row.index + 1}</p>
                ),
            },
            {
                header: 'METHOD',
                cell: ({ row }) => (
                    <Chip
                        size="sm"
                        variant="flat"
                        color={methodColorMap[row.original.method] ?? 'default'}
                    >
                        {row.original.method}
                    </Chip>
                ),
            },
            {
                header: 'PATH',
                cell: ({ row }) => (
                    <span className="text-sm text-default-700">{row.original.path}</span>
                ),
            },
            {
                header: 'USER',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="text-sm text-default-700">
                            {row.original.userId ?? 'N/A'}
                        </span>
                        <span className="text-xs text-default-400">
                            {row.original.userRole ?? 'guest'}
                        </span>
                    </div>
                ),
            },
            {
                header: 'IP',
                cell: ({ row }) => (
                    <span className="text-xs text-default-500">
                        {row.original.ipAddress || 'N/A'}
                    </span>
                ),
            },
            {
                header: 'PAYLOAD',
                cell: ({ row }) => (
                    <button
                        type="button"
                        className="text-xs text-default-400 max-w-32 truncate text-left hover:text-default-600"
                        onClick={() => {
                            const raw = row.original.payload ?? '';
                            if (!raw) {
                                return;
                            }
                            let formatted = raw;
                            try {
                                formatted = JSON.stringify(JSON.parse(raw), null, 2);
                            } catch {
                                formatted = raw;
                            }
                            setPayloadModal({
                                isOpen: true,
                                title: `Payload #${row.original.id}`,
                                content: formatted,
                            });
                        }}
                    >
                        {row.original.payload || '—'}
                    </button>
                ),
            },
            {
                header: 'TIME',
                cell: ({ row }) => (
                    <span className="text-xs text-default-500">
                        {new Date(row.original.timestamp).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                ),
            },
        ],
        [logsOffset],
    );

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Activity Logs</h1>
                <p className="text-sm text-default-500">
                    Immutable audit trail of admin and system actions. Entries older than 90 days
                    are automatically deleted.
                </p>
            </div>

            <DataTable columns={columns} data={logs} isLoading={isLoading} />

            <DataTablePagination
                pagination={{
                    count: logsMeta?.total ?? 0,
                    page: logsMeta?.page ?? logsPage,
                    pageSize: logsMeta?.limit ?? logsLimit,
                    totalPages: logsTotalPages,
                }}
                onPageChange={(page) => {
                    const next = Math.min(Math.max(1, page), logsTotalPages);
                    setLogsPage(next);
                }}
                onPageSizeChange={(size) => {
                    setLogsLimit(size);
                    setLogsPage(1);
                }}
            />

            <Modal
                isOpen={payloadModal.isOpen}
                onClose={() => setPayloadModal({ isOpen: false, title: '', content: '' })}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">{payloadModal.title}</ModalHeader>
                    <ModalBody>
                        <pre className="text-xs whitespace-pre-wrap wrap-break-word bg-default-100 rounded-lg p-3">
                            {payloadModal.content}
                        </pre>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </div>
    );
}
