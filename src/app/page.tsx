import { Navbar } from "@/components/navbar"
import HeroSection from "@/components/sections/hero/section"
import PreviewSection from "@/components/sections/preview/section"
import FeaturesSection from "@/components/sections/features"
import ContactSection from "@/components/sections/contacts"
import { ComparisonSection } from "@/components/sections/comparison/section"
import { Footer } from "@/components/footer"
import { PageBackground } from "@/components/decoration/background"
import BentoFeaturesSection from "@/components/sections/bento-features"

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
        <FeaturesSection />
        <ContactSection />
        <Footer />
      </div>
    </div>
  )
}