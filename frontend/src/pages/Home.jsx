import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Bento from '@/components/home/Bento';
import { EventsPreview, MerchPreview } from '@/components/home/Showcase';
import { MembershipPreview, NewsPreview, CtaBand } from '@/components/home/Community';

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <Bento />
      <EventsPreview />
      <MembershipPreview />
      <MerchPreview />
      <NewsPreview />
      <CtaBand />
    </>
  );
}
