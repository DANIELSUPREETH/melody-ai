import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import UploadBox from "../components/UploadBox";
import Footer from "../components/layout/Footer";

function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <Hero />
      <UploadBox />
      <Footer />
    </div>
  );
}

export default Home;
