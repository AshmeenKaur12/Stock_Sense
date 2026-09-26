import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { movesApi, type MoveFilters, type MoveListParams } from './api';

export function useMoves(params: MoveListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.moves.list({ ...params }),
    queryFn: () => movesApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 15_000,
  });
}

export function useMovesKanban(params: MoveFilters, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.moves.all, 'kanban', { ...params }] as const,
    queryFn: () => movesApi.kanban(params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 15_000,
  });
}

export function useExportMoves() {
  return useMutation({ mutationFn: (params: MoveFilters) => movesApi.exportCsv(params) });
}
