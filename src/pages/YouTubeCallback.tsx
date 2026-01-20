import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { handleYouTubeCallback } from '@/lib/youtube-oauth';

export default function YouTubeCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError(errorParam === 'access_denied' ? 'You denied access to your YouTube account' : errorParam);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setError('Missing authorization code');
        return;
      }

      const result = await handleYouTubeCallback(code, state);
      
      if (result.success) {
        setStatus('success');
        setTimeout(() => navigate('/dashboard/settings'), 2000);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to connect YouTube');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Connecting YouTube...</h1>
            <p className="text-neutral-400">Please wait while we set up your connection.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">YouTube Connected!</h1>
            <p className="text-neutral-400">Redirecting to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Connection Failed</h1>
            <p className="text-neutral-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
