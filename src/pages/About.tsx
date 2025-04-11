import React from 'react';

export default function About() {
  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-8 text-white/90 text-center">About Sol Charts</h1>
      
      <div className="bg-[#1E1E2A] rounded-lg p-6 shadow-lg">
        <p className="mb-4">
          Sol Charts is a dashboard application that visualizes performance metrics for various Solana protocols.
        </p>
        
        <h2 className="text-xl font-semibold mb-2 mt-6">Supported Protocols</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Bull X</li>
          <li>Photon</li>
          <li>Trojan</li>
        </ul>
        
        <h2 className="text-xl font-semibold mb-2 mt-6">How to Use</h2>
        <p className="mb-2">
          You can switch between different protocols by using the URL parameter "protocol":
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><code className="bg-[#13131A] px-2 py-1 rounded">?protocol=bullx</code> - View Bull X data</li>
          <li><code className="bg-[#13131A] px-2 py-1 rounded">?protocol=photon</code> - View Photon data</li>
          <li><code className="bg-[#13131A] px-2 py-1 rounded">?protocol=trojan</code> - View Trojan data</li>
          <li><code className="bg-[#13131A] px-2 py-1 rounded">?protocol=all</code> - View combined data from all protocols</li>
        </ul>
      </div>
    </div>
  );
}
