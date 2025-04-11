import { useNavigate, useSearchParams } from 'react-router-dom';

export function ProtocolSelector() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentProtocol = searchParams.get('protocol') || 'bullx';

  const protocols = [
    { id: 'bullx', name: 'Bull X' },
    { id: 'photon', name: 'Photon' },
    { id: 'trojan', name: 'Trojan' },
    { id: 'all', name: 'All Protocols' }
  ];

  const handleProtocolChange = (protocolId: string) => {
    navigate(`/?protocol=${protocolId}`);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => handleProtocolChange(protocol.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentProtocol === protocol.id
                ? 'bg-blue-600 text-white'
                : 'bg-[#1E1E2A] text-white/70 hover:bg-[#2A2A3A] hover:text-white'
            }`}
          >
            {protocol.name}
          </button>
        ))}
      </div>
    </div>
  );
}
