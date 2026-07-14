export default function Home() {
  return (
    <main className="video-hero">
      <video
        className="video-hero__media"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/vpn-background.mp4" type="video/mp4" />
      </video>
    </main>
  );
}
