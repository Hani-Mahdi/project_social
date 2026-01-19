import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { Play, Search, Filter, Loader2, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserVideos, getVideoPosts, type Video, type Post, type Platform } from "@/lib/database";
import { deleteVideoFromFreeBucket } from "@/lib/uploadlimit";

interface VideoWithPosts extends Video {
  posts?: Post[];
}

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

  const platformIcons: Record<string, JSX.Element> = {
    TikTok: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    Instagram: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    YouTube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    Twitter: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  };

  const platformColors: Record<string, string> = {
    tiktok: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)",
    instagram: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)",
    youtube: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)",
    twitter: "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)",
  };

  const platformDisplayNames: Record<Platform, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    twitter: "Twitter",
  };

  // Fetch videos from database
  useEffect(() => {
    async function loadVideos() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const allVideos = await getUserVideos(user.id);
        
        // Get posts for each video
        const videosWithPosts = await Promise.all(
          allVideos.map(async (video) => {
            const posts = await getVideoPosts(video.id);
            return { ...video, posts };
          })
        );
        
        setVideos(videosWithPosts);
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

  // Filter videos by search and platform
  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery || 
      (video.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       video.caption?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPlatform = filterPlatform === "all" || 
      video.posts?.some(p => p.platform === filterPlatform);
    
    return matchesSearch && matchesPlatform;
  });

  const platforms = ["all", "tiktok", "instagram", "youtube", "twitter"];

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
                  {platform === "all" ? "All Platforms" : platformDisplayNames[platform as Platform]}
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
                      video.posts.map((post) => (
                        <div
                          key={post.platform}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                          style={{ background: platformColors[post.platform] }}
                          title={platformDisplayNames[post.platform]}
                        >
                          {platformIcons[platformDisplayNames[post.platform]]}
                        </div>
                      ))
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
