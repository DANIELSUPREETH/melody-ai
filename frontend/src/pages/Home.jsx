import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import UploadSection from "../components/sections/UploadSection";
import Stats from "../components/sections/Stats";
import TrustedBy from "../components/sections/TrustedBy";
import Features from "../components/sections/Features";
import HowItWorks from "../components/sections/HowItWorks";
import Footer from "../components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-white">
      <Navbar />
      <Hero />
      <UploadSection />
      <Stats />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  );
}