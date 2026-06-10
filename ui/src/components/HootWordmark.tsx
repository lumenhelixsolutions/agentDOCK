import { BRAND } from "@/lib/brand";

const GOLD = "#E8D5A3";

export default function HootWordmark({
  showSubtitle = true,
  compact = false,
}: {
  showSubtitle?: boolean;
  compact?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: compact ? 17 : 20,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: "0.22em",
          lineHeight: 1,
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        {BRAND.name}
      </div>
      {showSubtitle && (
        <div
          style={{
            marginTop: compact ? 5 : 7,
            fontSize: compact ? 8 : 9,
            fontWeight: 500,
            color: "rgba(220,215,200,0.68)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            lineHeight: 1.35,
          }}
        >
          {BRAND.subtitle}
        </div>
      )}
    </div>
  );
}