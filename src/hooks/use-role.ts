import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Roles granted to the signed-in person (doctor, admin, patient). */
export function useRoles() {
  const { userId } = useAuth();
  const query = useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return data.map((r) => r.role as string);
    },
  });

  const roles = query.data ?? [];
  return { roles, isDoctor: roles.includes("doctor"), loading: query.isLoading, userId };
}
