export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dot-grid bg-radial-fade relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* Glow spot top-center */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 600,
          height: 300,
          background: "radial-gradient(ellipse at center top, rgba(91,127,255,0.12) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
