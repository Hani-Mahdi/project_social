import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, X, Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { validateVideoFile, formatFileSize } from "@/lib/upload";
import { useAuth } from "@/hooks/useAuth";
import { getFreeBucketStats, uploadVideoToFreeBucket, VIDEO_UPLOAD_CONSTANTS, type VideoStats } from "@/lib/uploadlimit";

interface VideoUploaderProps {
  onUploadComplete?: (url: string) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadStats, setUploadStats] = useState<VideoStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Load upload stats on mount
  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      
      try {
        const stats = await getFreeBucketStats();
        setUploadStats(stats);
      } catch (error) {
        console.error("Failed to load upload stats:", error);
      } finally {
        setLoadingStats(false);
      }
    }
    
    loadStats();
  }, [user]);

  const canUpload = uploadStats?.canUpload ?? true;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (canUpload) setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (!canUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) return;
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    setUploadedUrl(null);
    
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }
    
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (selectedFile && user) {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      setUploadProgress(0);
      
      try {
        // Upload with limit enforcement (returns path + url)
        const result = await uploadVideoToFreeBucket(selectedFile);
        
        setUploadedUrl(result.url);
        setUploadSuccess(true);
        setUploadProgress(100);
        onUploadComplete?.(result.url);
        
        // Refresh upload stats
        const newStats = await getFreeBucketStats();
        setUploadStats(newStats);
        
        // Navigate to post builder with video URL and storage path
        setTimeout(() => {
          navigate("/dashboard/post", { 
            state: { 
              videoUrl: result.url,
              storagePath: result.path,
              videoName: selectedFile.name 
            } 
          });
        }, 1000);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
        setUploadProgress(0);
      } finally {
        setUploading(false);
      }
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadedUrl(null);
    setUploadSuccess(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadedUrl(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Upload Limit Display */}
      {!loadingStats && uploadStats && (
        <div className="mb-6 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">Upload Limit</p>
              <p className="text-lg font-semibold text-white">
                {uploadStats.totalVideos} / {VIDEO_UPLOAD_CONSTANTS.MAX_VIDEOS} videos
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400">Remaining</p>
              <p className={`text-lg font-semibold ${
                uploadStats.remainingSlots > 0 ? "text-green-400" : "text-red-400"
              }`}>
                {uploadStats.remainingSlots} slots
              </p>
            </div>
          </div>
          {!uploadStats.canUpload && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                Upload limit reached. Delete existing videos to upload more.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload zone - modern card style */}
      <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-2xl p-10 text-center transition-all bg-neutral-900 border ${
            dragActive
              ? "border-violet-500 bg-violet-500/10"
              : selectedFile
              ? "border-green-500/50 bg-green-500/5"
              : uploadError
              ? "border-red-500/50 bg-red-500/5"
              : !canUpload
              ? "border-red-500/50 bg-red-500/5"
              : "border-neutral-800 hover:border-neutral-700"
          }`}
        >
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={!canUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          {selectedFile ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-green-400" />
              </div>
              <p className="font-medium text-white mb-1">{selectedFile.name}</p>
              <p className="text-sm text-neutral-500 mb-2">{formatFileSize(selectedFile.size)}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="text-sm text-neutral-500 hover:text-red-400 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : !canUpload ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="font-medium text-red-400 mb-2">Upload limit reached</p>
              <p className="text-sm text-neutral-500 max-w-sm">
                You’ve used all {VIDEO_UPLOAD_CONSTANTS.MAX_VIDEOS} free uploads. Delete an existing video to upload more.
              </p>
            </div>
          ) : uploadError ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <p className="font-medium text-red-400 mb-1">{uploadError}</p>
              <p className="text-sm text-neutral-500">Try another file</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="font-medium text-white mb-2">
                Drop your video here
              </p>
              <p className="text-sm text-neutral-500">
                or click to browse • MP4, MOV, WebM • Max 50MB
              </p>
            </>
          )}
        </div>

      {/* Upload status */}
      {uploadError && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="font-medium text-red-400">{uploadError}</span>
          </div>
        </div>
      )}

      {/* Upload button or success state */}
      {uploadSuccess ? (
        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-medium text-green-400">Upload successful!</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting to post builder...</span>
          </div>
        </div>
      ) : (
        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !canUpload}
          className="w-full mt-6 h-12 bg-white hover:bg-neutral-200 text-neutral-900 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload video
            </>
          )}
        </Button>
      )}
    </div>
  );
}
