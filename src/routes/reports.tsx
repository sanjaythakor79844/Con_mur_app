import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { tab: "home" },
      replace: true,
    });
  },
  component: () => null,
});
