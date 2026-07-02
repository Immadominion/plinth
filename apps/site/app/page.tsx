import Hero from "@/components/Hero";
import Subscriptions from "@/components/sections/Subscriptions";
import Accounts from "@/components/sections/Accounts";
import HowItWorks from "@/components/sections/HowItWorks";
import NigeriaPays from "@/components/sections/NigeriaPays";
import UseCases from "@/components/sections/UseCases";
import Developers from "@/components/sections/Developers";
import Trust from "@/components/sections/Trust";
import Pricing from "@/components/sections/Pricing";
import Testimonials from "@/components/sections/Testimonials";
import FAQ from "@/components/sections/FAQ";
import FinalCTA from "@/components/sections/FinalCTA";
import Footer from "@/components/sections/Footer";

export default function Page() {
  return (
    <main>
      {/* Hero carries the "Built on Nomba rails" brand marquee on the bridge road. */}
      <Hero />
      {/* Subscriptions owns the Problem → Subscriptions act: one pinned bronze
          choreography on desktop, the two sections stacked on mobile/reduced-motion. */}
      <Subscriptions />
      <Accounts />
      <HowItWorks />
      <NigeriaPays />
      <UseCases />
      <Developers />
      <Trust />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
