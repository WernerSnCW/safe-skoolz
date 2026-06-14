import { JourneySection } from "@/components/home/JourneySection";
import { PathwayOperatorControls } from "@/components/home/PathwayOperatorControls";

// Note: AppShell is NOT imported here — ProtectedRoute in App.tsx already wraps
// the component in AppShell. Adding it here would double-wrap the shell.
export default function JourneyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <JourneySection />
      <PathwayOperatorControls />
    </div>
  );
}
