import { useNavigate, useSearchParams } from 'react-router-dom';

interface ProtocolSelectorProps {
  currentProtocol: string;
  onProtocolChange: (protocol: string) => void;
}

export function ProtocolSelector({ currentProtocol, onProtocolChange }: ProtocolSelectorProps) {
  const protocols = [
    { id: 'bullx', name: 'Bull X' },
    { id: 'photon', name: 'Photon' },
    { id: 'trojan', name: 'Trojan' },
    { id: 'axiom', name: 'Axiom' },
    { id: 'gmgnai', name: 'GmGnAi' },
    { id: 'bloom', name: 'Bloom' },
    { id: 'all', name: 'All Protocols' }
  ];

  const handleProtocolChange = (protocolId: string) => {
    onProtocolChange(protocolId);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => handleProtocolChange(protocol.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentProtocol === protocol.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {protocol.name}
          </button>
        ))}
      </div>
    </div>
  );
}
