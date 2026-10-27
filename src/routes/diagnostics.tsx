import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/diagnostics")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { tab: "markers" },
      replace: true,
    });
  },
  component: () => null,
});
