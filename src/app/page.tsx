import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { softwareApplicationSchema } from '@/lib/seo/schema';
import HomeHeader from '@/components/home/HomeHeader';
import HomeHero from '@/components/home/HomeHero';
import TrustBand from '@/components/home/TrustBand';
import Pipeline from '@/components/home/Pipeline';
import ValuesMarquee from '@/components/home/ValuesMarquee';
import Calculator from '@/components/home/Calculator';
import Faq from '@/components/home/Faq';
import FinalCta from '@/components/home/FinalCta';
import HomeFooter from '@/components/home/HomeFooter';

const HOME_TITLE = 'SYNQ — Get Your Business Found Online & Find New Customers';
export const metadata: Metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description:
      'SYNQ helps your business get found on Google and AI search, and connects you with people already looking to buy what you sell — so you can reach out and win.',
    path: '/',
  }),
  title: { absolute: HOME_TITLE },
};

export default function HomePage() {
  return (
    <div className="overflow-x-hidden bg-surface">
      <JsonLd data={softwareApplicationSchema()} />
      <HomeHeader />
      <HomeHero />
      <TrustBand />
      <Pipeline />
      <ValuesMarquee />
      <Calculator />
      <Faq />
      <FinalCta />
      <HomeFooter />
    </div>
  );
}
