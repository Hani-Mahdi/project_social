import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { useAuth } from "@/hooks/useAuth";
import { Video, Send, Zap, Calendar, Play, ArrowUpRight, X, Loader2, MoreVertical, Edit, Trash2 } from "lucide-react";
import { getUserStats, getRecentVideos, type UserStats, type VideoWithPosts } from "@/lib/database";
import { deleteVideoFromFreeBucket } from "@/lib/uploadlimit";
import { toast } from "@/components/ui/sonner";
import { PLATFORM_LIST } from "@/constants/platforms";
import { OptimizeLastPostCard } from "@/components/dashboard/OptimizeLastPostCard";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";

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
        
        setUserStats(stats);
        setVideos(recentVids);
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
      toast.success("Video deleted");
    } catch (error) {
      toast.error("Couldn't delete - try again");
      if (import.meta.env.DEV) console.error("Failed to delete video:", error);
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

  const platforms = PLATFORM_LIST.map((platform) => ({
    ...platform,
    posts: userStats?.platformStats[platform.id] || 0,
    scheduled: 0,
  }));

  const selectedPlatformData = selectedPlatform 
    ? platforms.find(p => p.name === selectedPlatform) 
    : null;

  // Filter videos by platform
  const filteredVideos = selectedPlatform
    ? videos.filter(v => {
        const platform = platforms.find(pl => pl.name === selectedPlatform);
        if (!platform) return false;
        return v.posts?.some(p => p.platform === platform.id) ?? false;
      })
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
              <h1 className="text-2xl font-semibold text-white">{fullName}</h1>
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

        <div className="mb-6 space-y-4">
          <OptimizeLastPostCard />
          <PerformanceWidget />
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
                    <platform.icon className="h-5 w-5" />
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
                  <selectedPlatformData.icon className="h-5 w-5" />
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
