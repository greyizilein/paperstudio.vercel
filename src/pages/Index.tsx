import { MarketingNavbar } from "@/components/firstdraft/marketing/Navbar";
import { MarketingHero } from "@/components/firstdraft/marketing/Hero";
import { ProofStrip } from "@/components/firstdraft/marketing/ProofStrip";
import ProductMock from "@/components/firstdraft/marketing/ProductMock";
import BentoGrid from "@/components/firstdraft/marketing/BentoGrid";
import { ProblemSolution } from "@/components/firstdraft/marketing/ProblemSolution";
import { MarketingHowItWorks } from "@/components/firstdraft/marketing/HowItWorks";
import { MarketingFeatures } from "@/components/firstdraft/marketing/Features";
import CitationControl from "@/components/firstdraft/marketing/CitationControl";
import FrameworkLibrary from "@/components/firstdraft/marketing/FrameworkLibrary";
import { MarketingPricing } from "@/components/firstdraft/marketing/Pricing";
import { CTABanner } from "@/components/firstdraft/marketing/CTABanner";
import { MarketingFooter } from "@/components/firstdraft/marketing/Footer";

const Index = () => {
  return (
    <div className="paperstudio-marketing min-h-screen">
      <MarketingNavbar />
      <main>
        <MarketingHero />
        <ProofStrip />
        <ProductMock />
        <BentoGrid />
        <ProblemSolution />
        <MarketingHowItWorks />
        <MarketingFeatures />
        <CitationControl />
        <FrameworkLibrary />
        <MarketingPricing />
        <CTABanner />
      </main>
      <MarketingFooter />
    </div>
  );
};

export default Index;
