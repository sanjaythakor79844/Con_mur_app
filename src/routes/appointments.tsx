import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/appointments")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { tab: "care" },
      replace: true,
    });
  },
  component: () => null,
});
