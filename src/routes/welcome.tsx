import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    throw redirect({
      to: "/liv",
      search: { view: "signin" },
      replace: true,
    });
  },
  component: () => null,
});
