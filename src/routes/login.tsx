import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { view: "signin" },
      replace: true,
    });
  },
  component: () => null,
});
