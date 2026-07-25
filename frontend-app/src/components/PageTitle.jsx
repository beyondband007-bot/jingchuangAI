export function PageTitle({
  as: Component = "h1",
  level = "page",
  className = "",
  children,
  ...props
}) {
  return (
    <Component
      className={`ui-${level}-title ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
