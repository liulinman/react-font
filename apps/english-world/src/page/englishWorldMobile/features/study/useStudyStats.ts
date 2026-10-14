import { useQuery } from "@tanstack/react-query";
import request from "@font/api";
import { getReciteStats, type GetStatsResponse } from "@/server/recite/recite";
import { useAuth } from "@/contexts/AuthContext";
export function useStudyStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mobile", "study-progress", user?.id, "stats"],
    queryFn: () => request<GetStatsResponse>(getReciteStats({ days: 7 })),
    retry: false,
  });
}
