import CosmicTypographyField from "./components/CosmicTypographyField";
import TunnelExperience from "./components/TunnelExperience";

export default function Home() {
  return (
    <main className="tunnel-page">
      <TunnelExperience videoSrc="/tunnel-source.mp4?v=2" />
      <CosmicTypographyField />
    </main>
  );
}
