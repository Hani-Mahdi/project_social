import { useState, useEffect } from 'react';
import { Loader2, Youtube, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startYouTubeOAuth, getYouTubeConnection, disconnectYouTube, type ConnectedAccount } from '@/lib/youtube-oauth';

export function ConnectYouTube() {
  const [connection, setConnection] = useState<ConnectedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    loadConnection();
  }, []);

  const loadConnection = async () => {
    setLoading(true);
    const conn = await getYouTubeConnection();
    setConnection(conn);
    setLoading(false);
  };

  const handleConnect = () => {
    startYouTubeOAuth();
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    const success = await disconnectYouTube();
    if (success) {
      setConnection(null);
    }
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
          <span className="text-neutral-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connection ? 'bg-red-600' : 'bg-neutral-800'}`}>
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white">YouTube</h3>
            {connection ? (
              <p className="text-sm text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Connected as {connection.platform_username || 'Unknown'}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">Not connected</p>
            )}
          </div>
        </div>

        {connection ? (
          <Button
            onClick={handleDisconnect}
            disabled={disconnecting}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            {disconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Disconnect
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Youtube className="w-4 h-4 mr-2" />
            Connect YouTube
          </Button>
        )}
      </div>

      {connection && connection.platform_avatar_url && (
        <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center gap-3">
          <img 
            src={connection.platform_avatar_url} 
            alt="Channel avatar"
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm text-neutral-400">
            Videos will be uploaded to this channel
          </span>
        </div>
      )}
    </div>
  );
}
