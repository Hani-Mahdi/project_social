import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { useAuth } from "@/hooks/useAuth";
import { Video, Send, Zap, Calendar, Play, ArrowUpRight, X, Loader2, MoreVertical, Edit, Trash2 } from "lucide-react";
import { getUserStats, getRecentVideos, getVideoPosts, type Video as VideoType, type UserStats, type Post } from "@/lib/database";
import { deleteVideoFromFreeBucket } from "@/lib/uploadlimit";

interface VideoWithPosts extends VideoType {
  posts?: Post[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [videos, setVideos] = useState<VideoWithPosts[]>([]);
  
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || "User";
  const lastName = user?.user_metadata?.last_name || "";
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  const email = user?.email || "";

  // Fetch data from database
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [stats, recentVids] = await Promise.all([
          getUserStats(user.id),
          getRecentVideos(user.id, 5)
        ]);
        
        // Get posts for each video
        const videosWithPosts = await Promise.all(
          recentVids.map(async (video) => {
            const posts = await getVideoPosts(video.id);
            return { ...video, posts };
          })
        );
        
        setUserStats(stats);
        setVideos(videosWithPosts);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(videoId);
    try {
      await deleteVideoFromFreeBucket(videoId);
      // Refresh videos list
      setVideos(videos.filter(v => v.id !== videoId));
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to delete video:", error);
      alert(error instanceof Error ? error.message : "Failed to delete video");
    } finally {
      setDeleting(null);
    }
  };

  const handleEditVideo = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/dashboard/post", { state: { videoId } });
  };

  const stats = [
    { label: "Total Videos", value: String(userStats?.totalVideos || 0), icon: Video },
    { label: "Scheduled", value: String(userStats?.scheduledVideos || 0), icon: Calendar },
    { label: "Published", value: String(userStats?.postedVideos || 0), icon: Send },
    { label: "Drafts", value: String(userStats?.draftVideos || 0), icon: Zap },
  ];

  const platforms = [
    { 
      name: "TikTok", 
      key: "tiktok" as const,
      posts: userStats?.platformStats.tiktok || 0, 
      scheduled: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      gradient: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)"
    },
    { 
      name: "Instagram", 
      key: "instagram" as const,
      posts: userStats?.platformStats.instagram || 0, 
      scheduled: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      gradient: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)"
    },
    { 
      name: "YouTube", 
      key: "youtube" as const,
      posts: userStats?.platformStats.youtube || 0, 
      scheduled: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      gradient: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)"
    },
    { 
      name: "Twitter", 
      key: "twitter" as const,
      posts: userStats?.platformStats.twitter || 0, 
      scheduled: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      gradient: "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)"
    },
  ];

  const selectedPlatformData = selectedPlatform 
    ? platforms.find(p => p.name === selectedPlatform) 
    : null;

  // Filter videos by platform
  const filteredVideos = selectedPlatform
    ? videos.filter(v => v.posts?.some(p => p.platform === platforms.find(pl => pl.name === selectedPlatform)?.key))
    : videos;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Sidebar />
        <main className="ml-64 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-neutral-400">Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Sidebar />

      <main className="ml-64 min-h-screen px-12 py-10">
        {/* User Header + Performance */}
        <div className="flex items-center justify-between mb-12">
          {/* User Info */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-2xl font-semibold">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white mb-1">{fullName}</h1>
              <p className="text-neutral-500 text-sm">{email}</p>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="flex items-center gap-10">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-semibold text-white">{stat.value}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs">{stat.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Stats */}
        <div className="mb-10">
          <h2 className="text-lg font-medium text-white mb-6">Platforms</h2>
          <div className="grid grid-cols-4 gap-4">
            {platforms.map((platform) => (
              <div 
                key={platform.name}
                onClick={() => setSelectedPlatform(selectedPlatform === platform.name ? null : platform.name)}
                className={`group relative overflow-hidden rounded-2xl p-5 transition-all cursor-pointer ${
                  selectedPlatform === platform.name 
                    ? "bg-neutral-900 border-2 border-neutral-700" 
                    : "bg-neutral-900/50 hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                }`}
              >
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: platform.gradient }} />
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: platform.gradient }}>
                    {platform.icon}
                  </div>
                  <span className="font-medium text-white">{platform.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-white">{platform.posts}</p>
                    <p className="text-xs text-neutral-500">published</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-neutral-400">{platform.scheduled}</p>
                    <p className="text-xs text-neutral-500">scheduled</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Platform Detail */}
        {selectedPlatformData && (
          <div className="mb-10 p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ background: selectedPlatformData.gradient }}>
                  {selectedPlatformData.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedPlatformData.name}</h3>
                  <p className="text-sm text-neutral-500">{selectedPlatformData.posts} published • {selectedPlatformData.scheduled} scheduled</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlatform(null)}
                className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform-specific videos */}
            <div className="space-y-2">
              {filteredVideos.length > 0 ? (
                filteredVideos.map((video, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Play className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate text-sm">{video.title}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        video.status === "posted" 
                          ? "bg-green-500/10 text-green-400" 
                          : video.status === "scheduled"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {video.status}
                      </span>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 text-sm text-center py-4">No videos for this platform yet</p>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        {!selectedPlatform && <div className="border-t border-neutral-800/50 mb-10" />}

        {/* Recent Videos Section - only show when no platform selected */}
        {!selectedPlatform && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-white">Recent Videos</h2>
          </div>
          
          {/* Video List */}
          <div className="space-y-3">
            {videos.length > 0 ? (
              videos.map((video, index) => (
                <div 
                  key={video.id}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-neutral-900/30 hover:bg-neutral-900/60 transition-all relative"
                >
                  {/* Play icon */}
                  <div 
                    onClick={() => navigate("/dashboard/post", { state: { videoId: video.id } })}
                    className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-neutral-500" />
                  </div>
                  
                  {/* Video Info */}
                  <div 
                    onClick={() => navigate("/dashboard/post", { state: { videoId: video.id } })}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="font-medium text-white truncate">{video.title || "Untitled"}</p>
                    <p className="text-sm text-neutral-500">
                      {video.posts?.length ? video.posts.map(p => p.platform).join(", ") : "No platforms"}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    video.status === "posted" 
                      ? "bg-green-500/10 text-green-400" 
                      : video.status === "scheduled"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {video.status}
                  </span>

                  {/* Three-dot menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === video.id ? null : video.id);
                      }}
                      className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-neutral-400" />
                    </button>

                    {/* Dropdown menu */}
                    {openMenuId === video.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-10">
                        <button
                          onClick={(e) => handleEditVideo(video.id, e)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-800 transition-colors rounded-t-lg"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteVideo(video.id, e)}
                          disabled={deleting === video.id}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-neutral-800 transition-colors rounded-b-lg disabled:opacity-50"
                        >
                          {deleting === video.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-neutral-500 mb-4">No videos yet</p>
                <button 
                  onClick={() => navigate("/dashboard/upload")}
                  className="text-violet-400 hover:text-violet-300 text-sm font-medium"
                >
                  Upload your first video
                </button>
              </div>
            )}
          </div>

          {/* Show More Button */}
          <button 
            onClick={() => navigate("/dashboard/library")}
            className="w-full mt-6 py-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            Show more
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        )}
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
    </div>
  );
};

export default Dashboard;
