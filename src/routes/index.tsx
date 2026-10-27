import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/liv", search, replace: true });
  },
  component: () => null,
});
