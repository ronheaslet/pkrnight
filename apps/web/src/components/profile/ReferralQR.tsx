import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

export default function ReferralQR() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrQuery = useQuery({
    queryKey: ["my-referral-qr"],
    queryFn: () => api.get("/clubs/users/me/referral-qr").then((r) => r.data),
    enabled: expanded,
  });

  const codeQuery = useQuery({
    queryKey: ["my-referral-code"],
    queryFn: () =>
      api.get("/clubs/users/me/referral-code").then((r) => r.data),
  });

  function handleCopy() {
    if (codeQuery.data?.url) {
      navigator.clipboard.writeText(codeQuery.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownload() {
    if (!qrQuery.data?.qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrQuery.data.qrCodeUrl;
    link.download = "my-referral-qr.png";
    link.click();
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#374151]/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-left">My Referral QR</h3>
          <p className="text-[10px] text-[#6b7280] text-left">
            Share to invite friends &amp; earn credit
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[#6b7280] transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* QR Code */}
          {qrQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-[#6b7280] text-sm animate-pulse">
                Loading QR...
              </div>
            </div>
          ) : qrQuery.data?.qrCodeUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={qrQuery.data.qrCodeUrl}
                alt="Referral QR Code"
                className="w-48 h-48 rounded-lg"
              />
            </div>
          ) : null}

          {/* Referral URL */}
          {codeQuery.data?.url && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={codeQuery.data.url}
                className="flex-1 px-3 py-2 bg-[#0f0f0f] rounded-lg text-xs text-[#9ca3af] font-mono border border-[#374151] truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          {/* Stats */}
          {codeQuery.data?.totalReferrals !== undefined && (
            <p className="text-[#6b7280] text-xs text-center">
              {codeQuery.data.totalReferrals} referral
              {codeQuery.data.totalReferrals !== 1 ? "s" : ""} so far
            </p>
          )}

          {/* Download */}
          {qrQuery.data?.qrCodeUrl && (
            <button
              onClick={handleDownload}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            >
              Download QR
            </button>
          )}
        </div>
      )}
    </div>
  );
}
