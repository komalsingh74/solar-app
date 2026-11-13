
const Loader = ({
  type = "inline",
  text = "Loading...",
  size = "md",
  className = "",
}) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-7 w-7 border-[3px]",
    lg: "h-10 w-10 border-4",
  };

  const spinner = (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-current border-t-transparent`}
    />
  );

  if (type === "page") {
    return (
      <div className={`flex min-h-[60vh] flex-col items-center justify-center gap-3 text-indigo-600 ${className}`}>
        {spinner}
        <p className="text-sm text-current">{text}</p>
      </div>
    );
  }

  if (type === "overlay") {
    return (
      <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 text-indigo-600 backdrop-blur-[2px] ${className}`}>
        {spinner}
        <p className="text-sm font-medium text-current">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 text-indigo-600 ${className}`}
      role="status"
      aria-live="polite"
    >
      {spinner}
      <span className="text-sm text-current">{text}</span>
    </div>
  );
};

export default Loader;
