export function PhotoButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      className="round"
      aria-label="拍照明信片"
      title="拍照明信片"
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="camera-icon">
        <path d="M3 7h4l2-2h6l2 2h4v12H3z" />
        <circle cx="12" cy="13" r="3.2" />
      </svg>
    </button>
  );
}
