import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { Play, Search, Filter, Loader2, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserVideos, type VideoWithPosts } from "@/lib/database";
import { deleteVideoFromFreeBucket } from "@/lib/uploadlimit";
import { toast } from "@/components/ui/sonner";
import { PLATFORM_LIST, PLATFORMS } from "@/constants/platforms";

const Library = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoWithPosts[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);

  const platformDisplayNames = Object.fromEntries(
    PLATFORM_LIST.map((platform) => [platform.id, platform.name]),
  );

  // Fetch videos from database
  useEffect(() => {
    async function loadVideos() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const allVideos = await getUserVideos(user.id);
        setVideos(allVideos);
      } catch (err) {
        console.error("Failed to load videos:", err);
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
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

  // Filter videos by search and platform
  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery || 
      (video.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       video.caption?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPlatform = filterPlatform === "all" || 
      video.posts?.some(p => p.platform === filterPlatform);
    
    return matchesSearch && matchesPlatform;
  });

  const platforms = ["all", ...PLATFORM_LIST.map((platform) => platform.id)];

  return (
    <div className="min-h-screen bg-neutral-950">
      <Sidebar />

      <main className="ml-64 min-h-screen px-12 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Library</h1>
            <p className="text-neutral-500">All your videos in one place</p>
          </div>
          <div className="text-sm text-neutral-500">
            {filteredVideos.length} videos
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="h-11 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-neutral-700 transition-colors"
            >
              {platforms.map(platform => (
                <option key={platform} value={platform}>
                  {platform === "all" ? "All Platforms" : platformDisplayNames[platform as keyof typeof platformDisplayNames]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : (
          /* Video Grid */
          <div className="grid grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <div 
                key={video.id}
                className="group p-4 rounded-2xl bg-neutral-900/50 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all relative"
              >
                {/* Three-dot menu */}
                <div className="absolute top-4 right-4 z-10">
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
                    <div className="absolute right-0 top-full mt-1 w-40 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl">
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

                {/* Thumbnail */}
                <div 
                  onClick={() => navigate("/dashboard/post", { state: { videoId: video.id } })}
                  className="aspect-video rounded-xl bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-neutral-700 transition-colors overflow-hidden cursor-pointer"
                >
                  {video.public_url ? (
                    <video src={video.public_url} className="w-full h-full object-cover" />
                  ) : (
                    <Play className="w-8 h-8 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
                  )}
                </div>
                
                {/* Info */}
                <div onClick={() => navigate("/dashboard/post", { state: { videoId: video.id } })} className="cursor-pointer">
                  <p className="font-medium text-white truncate mb-2">{video.title || "Untitled"}</p>
                  
                  {/* Platform badges */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {video.posts && video.posts.length > 0 ? (
                      video.posts.map((post) => {
                        const Icon = PLATFORMS[post.platform].icon;
                        return (
                          <div
                            key={post.platform}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                            style={{ background: PLATFORMS[post.platform].gradient }}
                            title={platformDisplayNames[post.platform]}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-neutral-500">No platforms</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      {new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
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
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredVideos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-neutral-500 mb-4">No videos found</p>
            <button 
              onClick={() => navigate("/dashboard/upload")}
              className="text-violet-400 hover:text-violet-300 text-sm font-medium"
            >
              Upload your first video
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

export default Library;
