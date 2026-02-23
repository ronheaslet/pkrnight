import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function AccountingIndex() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/clubs/${clubId}/accounting/settlement`, { replace: true });
  }, [clubId, navigate]);

  return null;
}
