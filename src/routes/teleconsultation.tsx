import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/teleconsultation")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { tab: "care" },
      replace: true,
    });
  },
  component: () => null,
});
