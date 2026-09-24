export function LoadingScreen({ done = false }: { done?: boolean }) {
  return (
    <div
      className={`loader ${done ? "loaded" : ""}`}
      role="status"
      aria-hidden={done || undefined}
    >
      <div className="petal" aria-hidden="true" />
      <h2>春天正在靠岸</h2>
      <p>给云朵装上翅膀…</p>
    </div>
  );
}
