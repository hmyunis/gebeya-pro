import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Tab,
    Tabs,
    useDisclosure,
} from '@heroui/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, Trash, X } from '@phosphor-icons/react';
import { api } from '../../lib/api';
import type { Order, OrderStatus, PaginatedResponse } from '../../types';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import CreateOrderModal from '../../components/orders/CreateOrderModal';
import { DataTable } from '../../components/table/DataTable';
import { DataTablePagination } from '../../components/table/DataTablePagination';

const statusTabs: { key: 'ALL' | OrderStatus; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

const statusColorMap: Record<
    OrderStatus,
    'default' | 'primary' | 'success' | 'warning' | 'danger'
> = {
    PENDING: 'warning',
    APPROVED: 'primary',
    SHIPPED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'default',
};

const formatBirr = (value: number | string) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
        return '0.00';
    }
    return numeric.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

type StatusFilter = 'ALL' | OrderStatus;
type OrderStatusCounts = {
    counts: Record<OrderStatus, number>;
    total: number;
};

export default function OrdersPage() {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersLimit, setOrdersLimit] = useState(10);
    const queryClient = useQueryClient();

    useEffect(() => {
        setOrdersPage(1);
    }, [statusFilter]);

    const { data: ordersResponse, isLoading } = useQuery<PaginatedResponse<Order>>({
        queryKey: ['orders', statusFilter, ordersPage, ordersLimit],
        queryFn: async () =>
            (
                await api.get('/orders', {
                    params: {
                        status: statusFilter === 'ALL' ? undefined : statusFilter,
                        page: ordersPage,
                        limit: ordersLimit,
                    },
                })
            ).data,
    });

    const { data: statusCounts } = useQuery<OrderStatusCounts>({
        queryKey: ['orders', 'status-counts'],
        queryFn: async () => (await api.get('/orders/status-counts')).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (orderId: number) => api.delete(`/orders/${orderId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'status-counts'] });
            onDeleteClose();
            setDeleteTarget(null);
        },
    });

    const orders = ordersResponse?.data ?? [];
    const ordersMeta = ordersResponse?.meta;
    const ordersTotalPages = Math.max(1, ordersMeta?.totalPages ?? 1);
    const ordersOffset = ((ordersMeta?.page ?? 1) - 1) * (ordersMeta?.limit ?? orders.length);

    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        onOpen();
    };

    const orderColumns = useMemo<ColumnDef<Order>[]>(
        () => [
            {
                header: '#',
                cell: ({ row }) => (
                    <p className="text-sm text-default-500">{ordersOffset + row.index + 1}</p>
                ),
            },
            {
                header: 'ORDER',
                cell: ({ row }) => (
                    <span className="font-mono text-default-400">#00{row.original.id}</span>
                ),
            },
            {
                header: 'CUSTOMER',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <p className="text-sm font-semibold">{row.original.user.firstName}</p>
                        <p className="text-xs text-default-400">
                            @{row.original.user.username || 'no_username'}
                        </p>
                    </div>
                ),
            },
            {
                header: 'TOTAL',
                cell: ({ row }) => (
                    <span className="font-semibold text-primary">
                        {formatBirr(row.original.totalAmount)} Birr
                    </span>
                ),
            },
            {
                header: 'STATUS',
                cell: ({ row }) => (
                    <Chip
                        className="capitalize"
                        color={statusColorMap[row.original.status]}
                        size="sm"
                        variant="flat"
                    >
                        {row.original.status}
                    </Chip>
                ),
            },
            {
                header: 'DATE',
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
                            onPress={() => handleViewDetails(row.original)}
                            startContent={<Eye className="h-3.5 w-3.5" />}
                        >
                            Details
                        </Button>
                        {row.original.status === 'CANCELLED' ? (
                            <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => {
                                    setDeleteTarget(row.original);
                                    onDeleteOpen();
                                }}
                                startContent={<Trash className="h-3.5 w-3.5" />}
                            >
                                Delete
                            </Button>
                        ) : null}
                    </div>
                ),
            },
        ],
        [ordersOffset],
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">Order Management</h1>
                    <Button
                        color="primary"
                        onPress={onCreateOpen}
                        startContent={<Plus className="h-4 w-4" />}
                    >
                        Create Order
                    </Button>
                </div>
                <Tabs
                    aria-label="Order status"
                    color="primary"
                    variant="underlined"
                    selectedKey={statusFilter}
                    onSelectionChange={(key) => setStatusFilter(String(key) as StatusFilter)}
                >
                    {statusTabs.map((tab) => {
                        const count =
                            tab.key === 'ALL'
                                ? (statusCounts?.total ?? 0)
                                : (statusCounts?.counts?.[tab.key] ?? 0);
                        return (
                            <Tab
                                key={tab.key}
                                title={
                                    <div className="flex items-center gap-2">
                                        <span>{tab.label}</span>
                                        <Chip size="sm" variant="flat" color="default">
                                            {count}
                                        </Chip>
                                    </div>
                                }
                            />
                        );
                    })}
                </Tabs>
            </div>

            <DataTable columns={orderColumns} data={orders} isLoading={isLoading} />

            <DataTablePagination
                pagination={{
                    count: ordersMeta?.total ?? 0,
                    page: ordersMeta?.page ?? ordersPage,
                    pageSize: ordersMeta?.limit ?? ordersLimit,
                    totalPages: ordersTotalPages,
                }}
                onPageChange={(page) => {
                    const next = Math.min(Math.max(1, page), ordersTotalPages);
                    setOrdersPage(next);
                }}
                onPageSizeChange={(size) => {
                    setOrdersLimit(size);
                    setOrdersPage(1);
                }}
            />

            <OrderDetailModal isOpen={isOpen} onClose={onClose} order={selectedOrder} />
            <CreateOrderModal isOpen={isCreateOpen} onClose={onCreateClose} />

            <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">Confirm Delete</ModalHeader>
                    <ModalBody>
                        <p>
                            {deleteTarget
                                ? `Are you sure you want to delete order #00${deleteTarget.id}? This cannot be undone.`
                                : ''}
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={onDeleteClose}
                            startContent={<X className="h-4 w-4" />}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="danger"
                            onPress={() => {
                                if (!deleteTarget) return;
                                deleteMutation.mutate(deleteTarget.id);
                            }}
                            startContent={<Trash className="h-4 w-4" />}
                            isLoading={deleteMutation.isPending}
                        >
                            Delete
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
