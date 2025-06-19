import { ProtocolManagement } from '../components/ProtocolManagement';

export default function ProtocolAdmin() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Protocol Administration</h1>
          <p className="text-muted-foreground mt-2">
            Manage protocols and their configuration
          </p>
        </div>
        
        <ProtocolManagement />
      </div>
    </div>
  );
}