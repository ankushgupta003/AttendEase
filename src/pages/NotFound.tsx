import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="text-center rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-status-absent-bg">
          <WarningCircle className="h-6 w-6 text-status-absent" weight="duotone" />
        </div>
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-4 text-lg text-muted-foreground">Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
