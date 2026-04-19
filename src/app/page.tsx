import { Navbar } from "@/components/sections/navbar";
import HeroSection from "@/components/sections/hero/section";
import PreviewSection from "@/components/sections/preview/section";
import FeaturesSection from "@/components/sections/features";
import { ComparisonSection } from "@/components/sections/comparison/section";
import { Footer } from "@/components/sections/footer";
import { PageBackground } from "@/components/decoration/background";
import FaqSection from "@/components/sections/faq/section";
import CommunitySection from "@/components/sections/community/section";
import { Section } from "@/components/ui/section";

export default function Home() {
  return (
    <div className="min-h-screen relative bg-gray-950">
      <PageBackground />

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <PreviewSection />
        <ComparisonSection />
        <FeaturesSection />

        <Section>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
              <CommunitySection />
            </div>
          </div>
        </Section>

        <Footer />
      </div>
    </div>
  );
}
