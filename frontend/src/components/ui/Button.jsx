export default function Button({
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`
        px-6
        py-3
        rounded-full
        font-medium
        transition-all
        duration-300
        hover:scale-105
        bg-gradient-to-r
        from-cyan-500
        to-violet-600
        hover:shadow-[0_0_40px_rgba(124,58,237,0.45)]
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}