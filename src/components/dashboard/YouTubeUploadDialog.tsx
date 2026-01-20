import { useState, useEffect } from "react";
import { X, Loader2, Upload, Play, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { uploadToYouTube, type YouTubeUploadResult } from "@/lib/upload_to_youtube";
import { getFreeBucketStats, type Video } from "@/lib/uploadlimit";

interface YouTubeUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function YouTubeUploadDialog({ isOpen, onClose }: YouTubeUploadDialogProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<YouTubeUploadResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadVideos();
    }
  }, [isOpen]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const stats = await getFreeBucketStats();
      setVideos(stats.videos);
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;

    setUploading(true);
    setResult(null);

    try {
      const uploadResult = await uploadToYouTube({
        videoId: selectedVideo.id,
        privacy: 'private'
      });

      setResult(uploadResult);

      if (uploadResult.success) {
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error("YouTube upload error:", error);
      setResult({
        success: false,
        post_id: '',
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedVideo(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Upload to YouTube</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {result ? (
            <div className={`p-4 rounded-xl ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <X className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'Upload successful!' : result.error || result.message}
                </span>
              </div>
              {result.youtube_id && (
                <p className="text-sm text-neutral-400 mt-2">YouTube ID: {result.youtube_id}</p>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-400 mb-4">No videos available</p>
              <p className="text-sm text-neutral-500">Upload a video first to post to YouTube</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-400 mb-4">Select a video to upload to YouTube:</p>
              <div className="space-y-2 overflow-y-auto flex-1 max-h-64">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedVideo?.id === video.id
                        ? 'bg-violet-500/20 border border-violet-500/50'
                        : 'bg-neutral-800/50 hover:bg-neutral-800 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-white truncate">{video.title || "Untitled"}</p>
                      <p className="text-xs text-neutral-500">{video.status}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedVideo || uploading}
                className="w-full mt-6 h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading to YouTube...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload to YouTube
                  </>
                )}
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
