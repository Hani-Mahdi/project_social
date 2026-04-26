import type { ComponentType, SVGProps } from "react";
import { Instagram, Music2, Twitter, Youtube } from "lucide-react";
import type { Platform } from "@/lib/database";

export type PlatformId = Platform;

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  gradient: string;
  color: string;
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    icon: Music2,
    gradient: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)",
    color: "#000000",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    gradient: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)",
    color: "#E1306C",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    icon: Youtube,
    gradient: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)",
    color: "#FF0000",
  },
  twitter: {
    id: "twitter",
    name: "Twitter",
    icon: Twitter,
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)",
    color: "#1a1a1a",
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);
