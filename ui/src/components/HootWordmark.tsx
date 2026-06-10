import { BRAND, BRAND_COLORS } from "@/lib/brand";

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
          fontSize: compact ? 16 : 19,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "0.14em",
          lineHeight: 1,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {BRAND.name}
      </div>
      {showSubtitle && (
        <div
          style={{
            marginTop: compact ? 4 : 6,
            fontSize: compact ? 9 : 10,
            fontWeight: 500,
            color: BRAND_COLORS.goldLight,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            lineHeight: 1.35,
            opacity: 0.82,
          }}
        >
          {BRAND.subtitle}
        </div>
      )}
    </div>
  );
}