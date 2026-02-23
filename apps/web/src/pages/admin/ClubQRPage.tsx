import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

export default function ClubQRPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);

  const qrQuery = useQuery({
    queryKey: ["club-qr", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/qr`).then((r) => r.data),
    enabled: !!clubId,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/clubs/${clubId}/generate-qr`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-qr", clubId] });
      setShowConfirm(false);
    },
  });

  const qrCodeUrl = qrQuery.data?.qrCodeUrl;
  const clubUrl = qrQuery.data?.url;

  function handleDownload() {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `club-qr-${clubId}.png`;
    link.click();
  }

  function handleRegenerate() {
    if (qrCodeUrl) {
      setShowConfirm(true);
    } else {
      generateMutation.mutate();
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Club QR Code</h1>
        <p className="text-[#6b7280] text-sm">
          Share this QR code for walk-in players to join
        </p>
      </div>

      <div className="px-5">
        {qrQuery.isLoading ? (
          <div className="text-center py-16 text-[#6b7280]">Loading...</div>
        ) : qrCodeUrl ? (
          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="bg-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center border border-[#374151]/50">
              <img
                src={qrCodeUrl}
                alt="Club QR Code"
                className="w-64 h-64 rounded-xl"
              />
              {clubUrl && (
                <p className="text-[#6b7280] text-xs mt-4 text-center break-all font-mono">
                  {clubUrl}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-xl font-bold transition-colors"
              >
                Download PNG
              </button>

              <button
                onClick={handleRegenerate}
                disabled={generateMutation.isPending}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-sm transition-colors"
              >
                {generateMutation.isPending
                  ? "Generating..."
                  : "Regenerate QR Code"}
              </button>
            </div>

            {/* Tip */}
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4">
              <p className="text-[#D4AF37] text-xs">
                Print and display this QR code at your venue. Walk-in players
                can scan it to instantly join your club.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="text-4xl opacity-30">QR</div>
            <p className="text-[#6b7280] text-sm">
              No QR code generated yet for this club
            </p>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="px-8 py-3 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-xl font-bold transition-colors"
            >
              {generateMutation.isPending
                ? "Generating..."
                : "Generate QR Code"}
            </button>
          </div>
        )}

        {generateMutation.isError && (
          <p className="text-red-400 text-xs text-center mt-4">
            Failed to generate QR code. Please try again.
          </p>
        )}
      </div>

      {/* Confirm Regenerate Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Regenerate QR?</h3>
            <p className="text-[#9ca3af] text-sm mb-5">
              This will create a new QR code. The old one will no longer work if
              you've printed it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-white/10 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
              >
                {generateMutation.isPending ? "..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
