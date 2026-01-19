import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Calendar, Clock, Hash, AtSign, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createVideo, saveDraft, getVideoWithPosts, type Platform } from "@/lib/database";

const platformIcons: Record<string, JSX.Element> = {
  TikTok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  YouTube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  Twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
};

const platformGradients: Record<string, string> = {
  TikTok: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)",
  Instagram: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)",
  YouTube: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)",
  Twitter: "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)",
};

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
  const { user } = useAuth();
  const { videoUrl, storagePath, videoName, videoId: existingVideoId } = location.state || {};

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

  const platforms = ["TikTok", "Instagram", "YouTube", "Twitter"];

  // Load existing draft data if videoId is provided
  useEffect(() => {
    async function loadDraft() {
      if (!existingVideoId || !user) return;
      
      setLoadingDraft(true);
      setIsEditMode(true);
      
      try {
        const videoData = await getVideoWithPosts(existingVideoId);
        
        // Set video data
        setCurrentVideoUrl(videoData.public_url);
        setCurrentVideoName(videoData.title || "Untitled");
        setTitle(videoData.title || "");
        setCaption(videoData.caption || "");
        
        // Set platforms from posts
        if (videoData.posts && videoData.posts.length > 0) {
          const platformNames = videoData.posts.map(post => {
            const platformKey = post.platform;
            return platformMap[platformKey] || platformKey;
          });
          setSelectedPlatforms(platformNames);
        }
        
        setIsSaved(true); // Mark as saved since we're loading existing data
      } catch (error) {
        console.error("Failed to load draft:", error);
        setSaveError("Failed to load draft data");
      } finally {
        setLoadingDraft(false);
      }
    }
    
    loadDraft();
  }, [existingVideoId, user]);

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

  const handlePost = async () => {
    if (!user || (!currentVideoUrl && !videoUrl)) return;
    
    setSavingDraft(true);
    setSaveError(null);
    
    try {
      // Create video record if it doesn't exist
      let currentVideoId = videoId;
      if (!currentVideoId) {
        const video = await createVideo({
          user_id: user.id,
          title: title || currentVideoName || videoName || "Untitled",
          storage_path: storagePath || currentVideoUrl || videoUrl,
          public_url: currentVideoUrl || videoUrl,
          caption,
          status: 'draft'
        });
        currentVideoId = video.id;
        setVideoId(currentVideoId);
      }
      
      // Save draft with platforms and title
      await saveDraft({
        videoId: currentVideoId,
        title: title || currentVideoName || videoName || "Untitled",
        caption,
        platforms: selectedPlatforms.map(p => platformMap[p]),
        scheduleType: 'now'
      });
      
      setIsSaved(true);
      console.log("Posted to:", selectedPlatforms);
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
      // Create video record if it doesn't exist
      let currentVideoId = videoId;
      if (!currentVideoId) {
        const video = await createVideo({
          user_id: user.id,
          title: title || currentVideoName || videoName || "Untitled",
          storage_path: storagePath || currentVideoUrl || videoUrl,
          public_url: currentVideoUrl || videoUrl,
          caption,
          status: 'draft'
        });
        currentVideoId = video.id;
        setVideoId(currentVideoId);
      }
      
      // Save draft with platforms and title
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
      
      // Navigate back to dashboard after saving
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
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

  if (!videoUrl && !currentVideoUrl) {
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
                {platforms.map(platform => (
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
                      style={{ background: platformGradients[platform] }}
                    >
                      {platformIcons[platform]}
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
                ))}
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
