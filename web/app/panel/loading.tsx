export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-56 rounded-lg bg-soft" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-soft" />)}
      </div>
      <div className="h-48 rounded-2xl bg-soft" />
    </div>
  );
}
