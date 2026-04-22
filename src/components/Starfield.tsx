import { useMemo } from "react";

type Star = { x: number; y: number; size: "tiny" | "" | "lg"; delay: number };

export function Starfield({ density = 120 }: { density?: number }) {
  const stars = useMemo<Star[]>(() => {
    const out: Star[] = [];
    for (let i = 0; i < density; i++) {
      const r = Math.random();
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: r < 0.7 ? "tiny" : r < 0.95 ? "" : "lg",
        delay: Math.random() * 5,
      });
    }
    return out;
  }, [density]);

  return (
    <div className="starfield" aria-hidden>
      {/* Nebula clouds */}
      <div
        className="absolute -top-32 -left-24 size-[60vmin] rounded-full opacity-50 animate-float-slow"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.22 285 / 0.5), transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute top-1/3 -right-20 size-[55vmin] rounded-full opacity-50 animate-float-slow"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.24 320 / 0.45), transparent 65%)",
          filter: "blur(60px)",
          animationDelay: "-3s",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 size-[50vmin] rounded-full opacity-40 animate-float-slow"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.22 220 / 0.4), transparent 65%)",
          filter: "blur(70px)",
          animationDelay: "-6s",
        }}
      />

      {/* Stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className={`star ${s.size}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Shooting stars */}
      <span className="shooting-star" style={{ animationDelay: "1s", top: "10%" }} />
      <span className="shooting-star" style={{ animationDelay: "5s", top: "40%" }} />
      <span className="shooting-star" style={{ animationDelay: "9s", top: "70%" }} />
    </div>
  );
}
