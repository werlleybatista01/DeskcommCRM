"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";

export function useUnblockContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => apiClient.post(`/api/v1/contacts/${contactId}/unblock`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
    onError: showApiError,
  });
}
