import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { YoureInBanner } from "@/components/home/YoureInBanner";
import { VoiceSection } from "@/components/home/VoiceSection";
import { JourneySection } from "@/components/home/JourneySection";
import { ShareSchoolCard } from "@/components/home/ShareSchoolCard";
import { FirstDataSection } from "@/components/home/FirstDataSection";
import { PtaSection } from "@/components/home/PtaSection";
import { ResultsSection } from "@/components/home/ResultsSection";
import { ConcernsSection } from "@/components/home/ConcernsSection";
import { ChildrenSafeguardingSection } from "@/components/home/ChildrenSafeguardingSection";
import { SwitchedOnPromises } from "@/components/home/SwitchedOnPromises";

// Phase 3: the parent community home — an ordered list of self-gating sections.
// Each renders live / locked / promised / nothing based on capability + data +
// membership state. Copy is placeholder (end-of-redesign content audit).
export default function CommunityHome() {
  const { user } = useAuth();

  // A rejected member must not see the approved home (every data call 403s).
  // Show a clear message instead of the member sections. Copy is placeholder.
  if (user?.membershipStatus === "rejected") {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <PageHeader
          eyebrow="Membership"
          title="Your membership wasn't approved"
          subtitle="If you think this is a mistake, contact your school's PTA — they manage community membership."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <YoureInBanner />
      <VoiceSection />
      <JourneySection />
      <ShareSchoolCard />
      <FirstDataSection />
      <PtaSection />
      <ResultsSection />
      <ConcernsSection />
      <ChildrenSafeguardingSection />
      <SwitchedOnPromises />
    </div>
  );
}
