import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Calendar, Clock, Hash, AtSign, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createVideo, saveDraft, getVideoWithPosts, type Platform } from "@/lib/database";
import { uploadToYouTube } from "@/lib/upload_to_youtube";
import { PLATFORM_LIST, PLATFORMS } from "@/constants/platforms";
import { toast } from "@/components/ui/sonner";
import { optimizePost, OptimizePostError, type OptimizationResultItem } from "@/lib/ai/client";
import { OptimizationPanel } from "@/components/optimization/OptimizationPanel";

// Map display names to database platform values
const platformMap: Record<string, Platform> = {
  TikTok: 'tiktok',
  Instagram: 'instagram',
  YouTube: 'youtube',
  Twitter: 'twitter'
};

const PostBuilder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { videoUrl, storagePath, videoName, videoId: stateVideoId } = location.state || {};
  const queryVideoId = searchParams.get("videoId");
  const existingVideoId = stateVideoId || queryVideoId;
  const shouldAutoOptimize = searchParams.get("autoOptimize") === "1";
  const hasAutoOptimizedRef = useRef(false);

  const [videoId, setVideoId] = useState<string | null>(existingVideoId || null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(videoUrl || null);
  const [currentVideoName, setCurrentVideoName] = useState<string>(videoName || "");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<Record<string, OptimizationResultItem> | null>(null);
  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null);

  const platforms = PLATFORM_LIST.map((platform) => platform.name);
  const oneLiner = caption || title || currentVideoName || videoName || "";

  const getSelectedPlatformIds = (): Platform[] =>
    selectedPlatforms
      .map((platformName) => platformMap[platformName])
      .filter(Boolean);

  // Load existing draft data if videoId is provided
  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      if (!existingVideoId || !user) return;

      setLoadingDraft(true);
      setIsEditMode(true);

      try {
        const videoData = await getVideoWithPosts(existingVideoId);

        // Check if component is still mounted
        if (cancelled || !videoData) return;

        // Set video data
        setCurrentVideoUrl(videoData.public_url);
        setCurrentVideoName(videoData.title || "Untitled");
        setTitle(videoData.title || "");
        setCaption(videoData.caption || "");

        // Set platforms from posts - create reverse platform map
        const reversePlatformMap: Record<string, string> = {
          'tiktok': 'TikTok',
          'instagram': 'Instagram',
          'youtube': 'YouTube',
          'twitter': 'Twitter'
        };

        if (videoData.posts && videoData.posts.length > 0) {
          const platformNames = videoData.posts.map(post =>
            reversePlatformMap[post.platform] || post.platform
          );
          setSelectedPlatforms(platformNames);
        }

        setIsSaved(true); // Mark as saved since we're loading existing data
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load draft:", error);
        setSaveError("Failed to load draft data");
      } finally {
        if (!cancelled) {
          setLoadingDraft(false);
        }
      }
    }

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [existingVideoId, user]);

  useEffect(() => {
    if (
      !shouldAutoOptimize ||
      hasAutoOptimizedRef.current ||
      loadingDraft ||
      !videoId ||
      selectedPlatforms.length === 0
    ) {
      return;
    }

    hasAutoOptimizedRef.current = true;
    void handleOptimize();
  }, [shouldAutoOptimize, loadingDraft, videoId, selectedPlatforms]);

  // Always show save modal if video is uploaded and not yet saved
  const hasUnsavedChanges = !isSaved && (currentVideoUrl || videoUrl);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleNavigate = (to: string | number) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(to);
      setShowLeaveModal(true);
    } else {
      if (typeof to === "number") {
        navigate(to);
      } else {
        navigate(to);
      }
    }
  };

  const confirmLeave = () => {
    setShowLeaveModal(false);
    if (pendingNavigation !== null) {
      if (typeof pendingNavigation === "number") {
        navigate(pendingNavigation);
      } else {
        navigate(pendingNavigation);
      }
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
    setIsSaved(false);
  };

  // Shared function to ensure video record exists
  const ensureVideoRecord = async (): Promise<string> => {
    if (videoId) return videoId;

    const video = await createVideo({
      user_id: user!.id,
      title: title || currentVideoName || videoName || "Untitled",
      storage_path: storagePath || currentVideoUrl || videoUrl,
      public_url: currentVideoUrl || videoUrl,
      caption,
      status: 'draft'
    });

    setVideoId(video.id);
    return video.id;
  };

  const handlePost = async () => {
    if (!user || (!currentVideoUrl && !videoUrl)) return;

    setSavingDraft(true);
    setSaveError(null);

    try {
      // Ensure video record exists
      const currentVideoId = await ensureVideoRecord();

      // Save draft with platforms and title
      await saveDraft({
        videoId: currentVideoId,
        title: title || currentVideoName || videoName || "Untitled",
        caption,
        platforms: selectedPlatforms.map(p => platformMap[p]),
        scheduleType: 'now'
      });

      // If YouTube is selected, trigger upload automatically
      if (selectedPlatforms.includes('YouTube')) {
        if (import.meta.env.DEV) console.log("Triggering YouTube upload...");
        const uploadResult = await uploadToYouTube({
          videoId: currentVideoId,
          privacy: 'public' // Default to public, could add UI for this later
        });

        if (uploadResult.success) {
          if (import.meta.env.DEV) console.log("YouTube upload triggered:", uploadResult.message);
        } else {
          console.warn("YouTube upload failed:", uploadResult.error);
          setSaveError(`Posted to other platforms, but YouTube upload failed: ${uploadResult.error}`);
        }
      }

      setIsSaved(true);
      if (import.meta.env.DEV) console.log("Posted to:", selectedPlatforms);

      // Navigate to dashboard after successful post
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || (!currentVideoUrl && !videoUrl)) return;

    setSavingDraft(true);
    setSaveError(null);

    try {
      // Ensure video record exists
      const currentVideoId = await ensureVideoRecord();

      // Save draft with platforms and title (only if platforms selected)
      if (selectedPlatforms.length > 0) {
        await saveDraft({
          videoId: currentVideoId,
          title: title || currentVideoName || videoName || "Untitled",
          caption,
          platforms: selectedPlatforms.map(p => platformMap[p]),
          scheduleType
        });
      }

      setIsSaved(true);

      // Navigate back to dashboard after saving (use navigate instead of setTimeout)
      navigate("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleOptimize = async (nonce?: string) => {
    if (!user || (!currentVideoUrl && !videoUrl) || selectedPlatforms.length === 0) {
      toast.error("Select at least one platform before optimizing");
      return;
    }

    setOptimizing(true);
    try {
      const currentVideoId = await ensureVideoRecord();
      const response = await optimizePost({
        videoId: currentVideoId,
        oneLiner: nonce ? `${oneLiner} ${nonce}` : oneLiner,
        platforms: getSelectedPlatformIds(),
      });
      setOptimizationResult(response.result);
      setUsage(response.usage ?? null);
    } catch (error) {
      if (error instanceof OptimizePostError) {
        const description = error.detail ? error.detail : error.code ? `Code: ${error.code}` : undefined;
        toast.error(error.message, description ? { description } : undefined);
        if (import.meta.env.DEV) console.error("optimize-post failed", error);
      } else {
        const message = error instanceof Error ? error.message : "Failed to optimize post";
        toast.error(message);
      }
    } finally {
      setOptimizing(false);
    }
  };

  const handleUseOptimization = (platform: Platform, suggestion: OptimizationResultItem) => {
    const platformName = PLATFORMS[platform].name;
    if (!selectedPlatforms.includes(platformName)) {
      setSelectedPlatforms((prev) => [...prev, platformName]);
    }
    setTitle(suggestion.title);
    setCaption(`${suggestion.hook}\n\n${suggestion.caption}\n\n${suggestion.hashtags.join(" ")}`.trim());
    setIsSaved(false);
    toast.success(`${platformName} suggestion applied`);
  };

  const handleEditOptimization = (platform: Platform, suggestion: OptimizationResultItem) => {
    handleUseOptimization(platform, suggestion);
  };

  const handleRegenerate = async () => {
    await handleOptimize(`nonce:${Date.now()}`);
  };

  if (loadingDraft) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Sidebar />
        <main className="ml-64 min-h-screen flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
            <p className="text-neutral-400">Loading draft...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!videoUrl && !currentVideoUrl && !videoId) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Sidebar />
        <main className="ml-64 min-h-screen flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-neutral-400 mb-4">No video selected</p>
            <Button onClick={() => navigate("/dashboard/upload")} variant="outline">
              Upload a video
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => handleNavigate(-1)}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditMode ? "Edit Draft" : "Create Post"}
            </h1>
            <p className="text-neutral-500 text-sm">
              {isEditMode ? "Update your draft and platforms" : "Build your post for multiple platforms"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left - Video Preview */}
          <div>
            <h2 className="text-lg font-medium text-white mb-4">Video Preview</h2>
            <div className="rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
              <video 
                src={currentVideoUrl || videoUrl} 
                controls 
                className="w-full aspect-[9/16] object-cover bg-black"
              />
              <div className="p-4 border-t border-neutral-800">
                <p className="text-sm text-neutral-400 truncate">{currentVideoName || videoName || "Uploaded video"}</p>
              </div>
            </div>
          </div>

          {/* Right - Post Details */}
          <div className="space-y-6">
            {/* Platform Selection */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Select Platforms</h2>
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((platform) => {
                  const platformId = platformMap[platform];
                  const Icon = PLATFORMS[platformId].icon;
                  return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      selectedPlatforms.includes(platform)
                        ? "bg-neutral-800 border-neutral-600"
                        : "bg-neutral-900/50 border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ background: PLATFORMS[platformId].gradient }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-white">{platform}</span>
                    {selectedPlatforms.includes(platform) && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Title</h2>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="Give your video a title..."
                className="w-full p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Caption */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Caption</h2>
              <textarea
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="Write your caption..."
                rows={4}
                className="w-full p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 resize-none"
              />
              <div className="flex items-center gap-4 mt-3">
                <button className="flex items-center gap-2 text-sm text-neutral-400 hover:text-violet-400 transition-colors">
                  <Hash className="w-4 h-4" />
                  Add hashtags
                </button>
                <button className="flex items-center gap-2 text-sm text-neutral-400 hover:text-violet-400 transition-colors">
                  <AtSign className="w-4 h-4" />
                  Mention
                </button>
              </div>
            </div>

            <div>
              <Button
                type="button"
                onClick={() => handleOptimize()}
                disabled={optimizing || selectedPlatforms.length === 0}
                className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {optimizing ? "Optimizing..." : "Optimize for all platforms"}
              </Button>
              {usage && (
                <p className="mt-2 text-sm text-neutral-400">
                  {Math.max(usage.limit - usage.count, 0)}/{usage.limit} free optimizations left today
                </p>
              )}
            </div>

            {optimizationResult && (
              <OptimizationPanel
                result={optimizationResult}
                onUse={handleUseOptimization}
                onEdit={handleEditOptimization}
                onRegenerate={handleRegenerate}
                isRegenerating={optimizing}
              />
            )}

            {/* Schedule */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">When to post</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setScheduleType("now")}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                    scheduleType === "now"
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Post now
                </button>
                <button
                  onClick={() => setScheduleType("schedule")}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                    scheduleType === "schedule"
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
              </div>

              {scheduleType === "schedule" && (
                <div className="mt-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center gap-3 text-neutral-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Schedule picker coming soon...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{saveError}</p>
              </div>
            )}

            {/* Post Button */}
            <Button
              onClick={handlePost}
              disabled={selectedPlatforms.length === 0 || savingDraft}
              className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl disabled:opacity-50"
            >
              {savingDraft ? (
                "Saving..."
              ) : scheduleType === "now" ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post to {selectedPlatforms.length || 0} platform{selectedPlatforms.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule post
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <UploadFab onSelectPlatform={(platform) => {
        if (platform === "YouTube") {
          setShowYouTubeDialog(true);
        } else {
          navigate("/dashboard/upload", { state: { platform } });
        }
      }} />

      <YouTubeUploadDialog 
        isOpen={showYouTubeDialog} 
        onClose={() => setShowYouTubeDialog(false)} 
      />

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowLeaveModal(false)}
          />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-2">Save draft?</h3>
            <p className="text-sm text-neutral-400 mb-6">
              Your changes will be lost if you don't save.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={confirmLeave}
                variant="ghost"
                className="flex-1 h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Discard
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="flex-1 h-10 bg-white hover:bg-neutral-200 text-neutral-900 font-medium"
              >
                {savingDraft ? "Saving..." : "Save draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostBuilder;
