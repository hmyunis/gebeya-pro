import { api } from '../../lib/api';
import type {
  BroadcastDeliveriesResponse,
  BroadcastDeliveryFilter,
  BroadcastQueueResponse,
  BroadcastRunDetail,
  BroadcastRunsResponse,
  BroadcastUsersResponse,
  CreateBroadcastPayload,
} from './types';

export async function createBroadcast(payload: CreateBroadcastPayload) {
  const response = await api.post<BroadcastQueueResponse>('/admin/broadcast', payload);
  return response.data;
}

export async function listBroadcastRuns(page: number, limit: number) {
  const response = await api.get<BroadcastRunsResponse>('/admin/broadcast/runs', {
    params: { page, limit },
  });
  return response.data;
}

export async function getBroadcastRun(runId: number) {
  const response = await api.get<BroadcastRunDetail>(`/admin/broadcast/runs/${runId}`);
  return response.data;
}

export async function listBroadcastDeliveries(
  runId: number,
  page: number,
  limit: number,
  filter: BroadcastDeliveryFilter,
) {
  const response = await api.get<BroadcastDeliveriesResponse>(
    `/admin/broadcast/runs/${runId}/deliveries`,
    {
      params: { page, limit, status: filter },
    },
  );
  return response.data;
}

export async function listBroadcastUsers(
  search: string,
  page: number,
  limit: number,
  role?: 'customer' | 'merchant' | 'admin',
) {
  const response = await api.get<BroadcastUsersResponse>('/admin/broadcast/users', {
    params: {
      search: search.trim() || undefined,
      page,
      limit,
      role,
    },
  });
  return response.data;
}

export async function repostBroadcast(runId: number) {
  const response = await api.post<BroadcastQueueResponse>(
    `/admin/broadcast/runs/${runId}/repost`,
  );
  return response.data;
}

export async function cancelBroadcast(runId: number) {
  const response = await api.post(`/admin/broadcast/runs/${runId}/cancel`);
  return response.data;
}

export async function deleteBroadcastRun(runId: number) {
  const response = await api.delete<{ id: number; deleted: boolean }>(
    `/admin/broadcast/runs/${runId}`,
  );
  return response.data;
}

export async function requeueUnknownDeliveries(runId: number) {
  const response = await api.post<{ runId: number; requeued: number }>(
    `/admin/broadcast/runs/${runId}/requeue-unknown`,
  );
  return response.data;
}
