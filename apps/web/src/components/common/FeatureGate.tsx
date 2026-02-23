import { useParams } from "react-router-dom";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function FeatureGate({
  featureKey,
  children,
  fallback,
}: FeatureGateProps) {
  const { clubId } = useParams<{ clubId: string }>();
  const { isEnabled, isLoaded } = useFeatureFlags(clubId);

  if (!isLoaded) return null;

  if (!isEnabled(featureKey)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
