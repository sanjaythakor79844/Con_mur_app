import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/progress")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { tab: "plan" },
      replace: true,
    });
  },
  component: () => null,
});
