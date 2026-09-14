export function ErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="loader failed" role="alert">
      <div className="petal" aria-hidden="true" />
      <h2>春天稍晚一点到</h2>
      <p className="error-message">{message}</p>
      <button className="retry" onClick={onRetry}>
        重新启程
      </button>
    </div>
  );
}
