import { OptimizerApp } from "@/components/OptimizerApp";
import { Suspense } from "react";

function HomeFallback() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 text-muted">
      <p className="font-mono text-xs tracking-[0.2em] uppercase">
        Chargement…
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <OptimizerApp />
    </Suspense>
  );
}
