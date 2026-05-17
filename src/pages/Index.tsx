import { MarketingNavbar } from "@/components/firstdraft/marketing/Navbar";
import { MarketingHero } from "@/components/firstdraft/marketing/Hero";
import { ProofStrip } from "@/components/firstdraft/marketing/ProofStrip";
import ProductMock from "@/components/firstdraft/marketing/ProductMock";
import { FeaturesSection } from "@/components/firstdraft/marketing/FeaturesSection";
import { HowItWorksSection } from "@/components/firstdraft/marketing/HowItWorksSection";
import { CzarSection } from "@/components/firstdraft/marketing/CzarSection";
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
        <FeaturesSection />
        <HowItWorksSection />
        <CzarSection />
        <MarketingPricing />
        <CTABanner />
      </main>
      <MarketingFooter />
    </div>
  );
};

export default Index;
