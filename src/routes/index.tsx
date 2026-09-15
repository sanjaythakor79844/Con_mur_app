import { createFileRoute } from "@tanstack/react-router";
import { Btn, Icon } from "@/components/aaha";
import hero from "@/assets/aaha-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aaha Companion — Your trusted health companion" },
      {
        name: "description",
        content:
          "Aaha Companion continues your care after a health screening: results, lab reports, simple explanations and care at an Aaha Health Centre.",
      },
      { property: "og:title", content: "Aaha Companion" },
      {
        property: "og:description",
        content: "Your trusted health companion, from screening to long-term care.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-hero px-6 pb-10 pt-14 text-primary-foreground">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-card text-primary">
          <Icon name="favorite" className="text-[28px]" />
        </span>
        <span className="text-xl font-bold tracking-tight">Aaha</span>
      </div>

      <div className="mt-8 overflow-hidden rounded-[2.5rem] bg-card/15 p-4">
        <img
          src={hero}
          alt="Illustration of a smiling woman with a heart symbol"
          width={1024}
          height={1024}
          className="mx-auto w-full max-w-[280px]"
        />
      </div>

      <div className="mt-8">
        <h1 className="text-4xl font-bold leading-tight">Aaha Companion</h1>
        <p className="mt-3 text-base text-primary-foreground/85">
          Your trusted health companion — understand your results, and continue your care with
          confidence.
        </p>
      </div>

      <div className="mt-auto pt-10">
        <Btn to="/language" variant="soft" icon="arrow_forward" className="min-h-16 text-lg">
          Continue
        </Btn>
      </div>
    </main>
  );
}
