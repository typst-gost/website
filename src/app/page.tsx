import { Navbar } from "@/components/sections/navbar";
import HeroSection from "@/components/sections/hero/section";
import PreviewSection from "@/components/sections/preview/section";
import UsageSection from "@/components/sections/usage/section";
import { ComparisonSection } from "@/components/sections/comparison/section";
import { Footer } from "@/components/sections/footer";
import { PageBackground } from "@/components/decoration/background";
import FaqSection from "@/components/sections/faq/section";
import BentoFeaturesSection from "@/components/sections/bento-features/section";

export default function Home() {
  return (
    <div className="min-h-screen relative bg-gray-950">
      <PageBackground />

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <PreviewSection />
        <BentoFeaturesSection />
        <ComparisonSection />
        <UsageSection />
        <FaqSection />
        <Footer />
      </div>
    </div>
  );
}
