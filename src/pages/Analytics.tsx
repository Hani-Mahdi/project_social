import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";
import { YouTubeUploadDialog } from "@/components/dashboard/YouTubeUploadDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Video, Upload, TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

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
  twitter: "#1a1a1a"
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
    if (platform === 'all') {
      setSelectedPlatforms(['all']);
    } else {
      const filtered = selectedPlatforms.filter(p => p !== 'all');
      if (filtered.includes(platform)) {
        const newSelection = filtered.filter(p => p !== platform);
        setSelectedPlatforms(newSelection.length === 0 ? ['all'] : newSelection);
      } else {
        setSelectedPlatforms([...filtered, platform]);
      }
    }
  };

  const statCards = [
    {
      icon: Video,
      label: "Total Videos",
      value: stats.totalVideos,
      color: "bg-violet-500"
    },
    {
      icon: Upload,
      label: "Total Posts",
      value: stats.totalPosts,
      color: "bg-blue-500"
    },
    {
      icon: TrendingUp,
      label: "Posted",
      value: stats.postedCount,
      color: "bg-green-500"
    },
    {
      icon: Calendar,
      label: "Scheduled",
      value: stats.scheduledCount,
      color: "bg-orange-500"
    }
  ];

  const platformFilters = [
    { id: 'all', label: 'All Platforms', color: platformColors.all },
    { id: 'youtube', label: 'YouTube', color: platformColors.youtube },
    { id: 'tiktok', label: 'TikTok', color: platformColors.tiktok },
    { id: 'instagram', label: 'Instagram', color: platformColors.instagram },
    { id: 'twitter', label: 'Twitter', color: platformColors.twitter }
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
                <div className="flex flex-wrap gap-2 mb-6">
                  {platformFilters.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => togglePlatform(filter.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedPlatforms.includes(filter.id)
                          ? 'text-white border-2'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                      style={{
                        borderColor: selectedPlatforms.includes(filter.id) ? filter.color : 'transparent',
                        backgroundColor: selectedPlatforms.includes(filter.id)
                          ? `${filter.color}20`
                          : undefined
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
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

                    {selectedPlatforms.includes('all') && (
                      <Line
                        type="monotone"
                        dataKey="all"
                        name="All Uploads"
                        stroke={platformColors.all}
                        strokeWidth={2}
                        dot={{ fill: platformColors.all, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {selectedPlatforms.includes('youtube') && (
                      <Line
                        type="monotone"
                        dataKey="youtube"
                        name="YouTube"
                        stroke={platformColors.youtube}
                        strokeWidth={2}
                        dot={{ fill: platformColors.youtube, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {selectedPlatforms.includes('tiktok') && (
                      <Line
                        type="monotone"
                        dataKey="tiktok"
                        name="TikTok"
                        stroke={platformColors.tiktok}
                        strokeWidth={2}
                        dot={{ fill: platformColors.tiktok, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {selectedPlatforms.includes('instagram') && (
                      <Line
                        type="monotone"
                        dataKey="instagram"
                        name="Instagram"
                        stroke={platformColors.instagram}
                        strokeWidth={2}
                        dot={{ fill: platformColors.instagram, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {selectedPlatforms.includes('twitter') && (
                      <Line
                        type="monotone"
                        dataKey="twitter"
                        name="Twitter"
                        stroke={platformColors.twitter}
                        strokeWidth={2}
                        dot={{ fill: platformColors.twitter, r: 4 }}
                        activeDot={{ r: 6 }}
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
