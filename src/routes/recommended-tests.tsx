import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recommended-tests")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { tab: "markers" },
      replace: true,
    });
  },
  component: () => null,
});
