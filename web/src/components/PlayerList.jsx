export function PlayerList({ participants }) {
  const active = participants.filter(p => p.status === 'playing')
  const eliminated = participants.filter(p => p.status === 'eliminated' || p.status === 'winner')
    .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold mb-2">
          Active Players ({active.length})
        </h3>
        <div className="space-y-1">
          {active.map((p) => (
            <div key={p.id} className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded">
              <span className="text-white">{p.display_name}</span>
              <div className="flex gap-2 text-sm">
                {p.rebuy_count > 0 && (
                  <span className="text-yellow-400">R{p.rebuy_count}</span>
                )}
                {p.bounty_count > 0 && (
                  <span className="text-red-400">B{p.bounty_count}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {eliminated.length > 0 && (
        <div>
          <h3 className="text-gray-400 font-semibold mb-2">
            Eliminated ({eliminated.length})
          </h3>
          <div className="space-y-1">
            {eliminated.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-gray-800/50 px-3 py-2 rounded opacity-60">
                <span className="text-gray-300">
                  {p.finish_position && <span className="text-gray-500 mr-2">#{p.finish_position}</span>}
                  {p.display_name}
                  {p.status === 'winner' && <span className="text-yellow-400 ml-2">Winner</span>}
                </span>
                <div className="flex gap-2 text-sm">
                  {p.bounty_count > 0 && (
                    <span className="text-red-400">B{p.bounty_count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
