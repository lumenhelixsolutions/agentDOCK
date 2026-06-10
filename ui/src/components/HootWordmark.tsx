import { HOOT_WORDMARK_SRC } from "@/lib/hoot-logo";

export default function HootWordmark({
  compact = false,
}: {
  showSubtitle?: boolean;
  compact?: boolean;
}) {
  const width = compact ? 108 : 132;

  return (
    <img
      src={HOOT_WORDMARK_SRC}
      alt="HOOT Local AI Command Center"
      width={width}
      style={{ display: "block", width, height: "auto" }}
      draggable={false}
    />
  );
}