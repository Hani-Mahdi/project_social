import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Video, Upload, TrendingUp, Calendar, Layers } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Platform Icons
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface Stats {
  totalVideos: number;
  totalPosts: number;
  postedCount: number;
  scheduledCount: number;
}

interface TimelineData {
  date: string;
  all: number;
  youtube: number;
  tiktok: number;
  instagram: number;
  twitter: number;
}

const platformColors = {
  all: "#8b5cf6",
  youtube: "#FF0000",
  tiktok: "#00f2ea",
  instagram: "#E1306C",
  twitter: "#1DA1F2"
};

const Analytics = () => {
  const { user } = useAuth();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalVideos: 0,
    totalPosts: 0,
    postedCount: 0,
    scheduledCount: 0
  });
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["all"]);
  const [dateRange, setDateRange] = useState<number>(30); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, dateRange]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load basic stats
      const [videosRes, postsRes] = await Promise.all([
        supabase
          .from('videos')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('posts')
          .select(`
            *,
            video:videos!inner(user_id)
          `)
          .eq('video.user_id', user.id)
      ]);

      if (videosRes.data) {
        const posts = postsRes.data || [];
        setStats({
          totalVideos: videosRes.data.length,
          totalPosts: posts.length,
          postedCount: posts.filter(p => p.status === 'posted').length,
          scheduledCount: posts.filter(p => p.status === 'scheduled').length
        });
      }

      // Load timeline data
      const startDate = startOfDay(subDays(new Date(), dateRange));
      const endDate = endOfDay(new Date());

      const { data: videosWithPosts } = await supabase
        .from('videos')
        .select(`
          id,
          created_at,
          posts (
            platform,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const dateMap = new Map<string, TimelineData>();

      // Initialize all dates in range
      for (let i = 0; i < dateRange; i++) {
        const date = format(subDays(new Date(), dateRange - i - 1), 'MMM dd');
        dateMap.set(date, {
          date,
          all: 0,
          youtube: 0,
          tiktok: 0,
          instagram: 0,
          twitter: 0
        });
      }

      // Count uploads by date and platform
      videosWithPosts?.forEach(video => {
        const date = format(new Date(video.created_at), 'MMM dd');
        const entry = dateMap.get(date);
        if (entry) {
          entry.all += 1;

          // Count by platform
          video.posts?.forEach((post: any) => {
            if (post.platform === 'youtube') entry.youtube += 1;
            if (post.platform === 'tiktok') entry.tiktok += 1;
            if (post.platform === 'instagram') entry.instagram += 1;
            if (post.platform === 'twitter') entry.twitter += 1;
          });
        }
      });

      setTimelineData(Array.from(dateMap.values()));
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms([platform]);
  };

  const statCards = [
    {
      icon: Video,
      label: "Total Videos",
      value: stats.totalVideos,
      color: "bg-neutral-800"
    },
    {
      icon: Upload,
      label: "Total Posts",
      value: stats.totalPosts,
      color: "bg-neutral-800"
    },
    {
      icon: TrendingUp,
      label: "Posted",
      value: stats.postedCount,
      color: "bg-neutral-800"
    },
    {
      icon: Calendar,
      label: "Scheduled",
      value: stats.scheduledCount,
      color: "bg-neutral-800"
    }
  ];

  const platformFilters = [
    { id: 'all', icon: Layers, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
    { id: 'youtube', icon: YouTubeIcon, gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)' },
    { id: 'tiktok', icon: TikTokIcon, gradient: 'linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)' },
    { id: 'instagram', icon: InstagramIcon, gradient: 'linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)' },
    { id: 'twitter', icon: TwitterIcon, gradient: 'linear-gradient(135deg, #1DA1F2 0%, #0c7abf 100%)' }
  ];

  return (
    <div className="flex h-screen bg-neutral-950">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
            <p className="text-neutral-400">Track your content performance and upload trends</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${stat.color} p-3 rounded-xl`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Chart */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Upload Timeline</h2>

                  {/* Date Range Selector */}
                  <div className="flex gap-2">
                    {[7, 14, 30, 90].map(days => (
                      <button
                        key={days}
                        onClick={() => setDateRange(days)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          dateRange === days
                            ? 'bg-violet-500 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Filters */}
                <div className="flex gap-3 mb-6 relative z-0">
                  {platformFilters.map(filter => {
                    const Icon = filter.icon;
                    const isActive = selectedPlatforms.includes(filter.id);
                    return (
                      <button
                        key={filter.id}
                        onClick={() => togglePlatform(filter.id)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all text-white ${
                          isActive
                            ? 'scale-110 shadow-lg'
                            : 'opacity-50 hover:opacity-75 hover:scale-105'
                        }`}
                        style={{
                          background: isActive ? filter.gradient : '#262626'
                        }}
                        title={filter.id.charAt(0).toUpperCase() + filter.id.slice(1)}
                      >
                        <Icon />
                      </button>
                    );
                  })}
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="date"
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#fff' }}
                    />

                    {selectedPlatforms[0] === 'all' && (
                      <Line
                        type="monotone"
                        dataKey="all"
                        name="All Uploads"
                        stroke={platformColors.all}
                        strokeWidth={3}
                        dot={{ fill: platformColors.all, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    )}
                    {selectedPlatforms[0] === 'youtube' && (
                      <Line
                        type="monotone"
                        dataKey="youtube"
                        name="YouTube"
                        stroke={platformColors.youtube}
                        strokeWidth={3}
                        dot={{ fill: platformColors.youtube, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    )}
                    {selectedPlatforms[0] === 'tiktok' && (
                      <Line
                        type="monotone"
                        dataKey="tiktok"
                        name="TikTok"
                        stroke={platformColors.tiktok}
                        strokeWidth={3}
                        dot={{ fill: platformColors.tiktok, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    )}
                    {selectedPlatforms[0] === 'instagram' && (
                      <Line
                        type="monotone"
                        dataKey="instagram"
                        name="Instagram"
                        stroke={platformColors.instagram}
                        strokeWidth={3}
                        dot={{ fill: platformColors.instagram, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    )}
                    {selectedPlatforms[0] === 'twitter' && (
                      <Line
                        type="monotone"
                        dataKey="twitter"
                        name="Twitter"
                        stroke={platformColors.twitter}
                        strokeWidth={3}
                        dot={{ fill: platformColors.twitter, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      <UploadFab onClick={() => setIsUploadDialogOpen(true)} />
      <YouTubeUploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
      />
    </div>
  );
};

export default Analytics;
