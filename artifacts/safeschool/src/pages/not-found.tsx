import { Link } from "wouter";
import { Button } from "@/components/ui-polished";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/10 text-destructive mb-8">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you are looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto">
            Return safely home
          </Button>
        </Link>
      </div>
    </div>
  );
}
