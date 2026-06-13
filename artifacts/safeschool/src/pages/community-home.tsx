import { YoureInBanner } from "@/components/home/YoureInBanner";
import { VoiceSection } from "@/components/home/VoiceSection";
import { PtaSection } from "@/components/home/PtaSection";
import { ResultsSection } from "@/components/home/ResultsSection";
import { ConcernsSection } from "@/components/home/ConcernsSection";
import { ChildrenSafeguardingSection } from "@/components/home/ChildrenSafeguardingSection";
import { SwitchedOnPromises } from "@/components/home/SwitchedOnPromises";

// Phase 3: the parent community home — an ordered list of self-gating sections.
// Each renders live / locked / promised / nothing based on capability + data +
// membership state. Copy is placeholder (end-of-redesign content audit).
export default function CommunityHome() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <YoureInBanner />
      <VoiceSection />
      <PtaSection />
      <ResultsSection />
      <ConcernsSection />
      <ChildrenSafeguardingSection />
      <SwitchedOnPromises />
    </div>
  );
}
