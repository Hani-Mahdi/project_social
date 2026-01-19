import { VideoUploader } from "@/components/dashboard/VideoUploader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UploadFab } from "@/components/dashboard/UploadFab";

const Upload = () => {
  const handleUploadComplete = (url: string) => {
    console.log("Video uploaded to:", url);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <Sidebar />

      <main className="ml-64 min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Upload your video
            </h1>
            <p className="text-neutral-400 text-lg">
              Upload to Supabase storage
            </p>
          </div>

          <VideoUploader onUploadComplete={handleUploadComplete} />
        </div>
      </main>

      <UploadFab onSelectPlatform={(platform) => console.log("Already on upload page, selected:", platform)} />
    </div>
  );
};

export default Upload;
