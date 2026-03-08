'use client';

import { useEffect, useState } from 'react';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { StorageService } from '@/lib/appwrite/storage';

const HERO_ASSETS_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ASSETS_BUCKET_ID || '699c351d000740c55993';
const HERO_IMAGE_FILENAME = 'Hero_image.jpeg';
const HERO_VIDEO_FILENAME = 'Hero_video.mp4';
const HERO_IMAGE_FILE_ID = process.env.NEXT_PUBLIC_APPWRITE_HERO_IMAGE_FILE_ID;
const HERO_VIDEO_FILE_ID = process.env.NEXT_PUBLIC_APPWRITE_HERO_VIDEO_FILE_ID;

export default function LandingPage() {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [canPlayVideo, setCanPlayVideo] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const shouldUseVideo = () => {
      if (typeof window === 'undefined') return false;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return false;

      const connection = (
        navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }
      ).connection;

      if (connection?.saveData) return false;

      const slowNetworkTypes = new Set(['slow-2g', '2g', '3g']);
      if (connection?.effectiveType && slowNetworkTypes.has(connection.effectiveType)) {
        return false;
      }

      return true;
    };

    const resolveHeroAssets = async () => {
      const allowVideo = shouldUseVideo();
      const [resolvedPosterUrl, resolvedVideoUrl] = await Promise.all([
        StorageService.resolvePublicFileViewUrl(
          HERO_ASSETS_BUCKET_ID,
          HERO_IMAGE_FILENAME,
          HERO_IMAGE_FILE_ID
        ),
        allowVideo
          ? StorageService.resolvePublicFileViewUrl(
              HERO_ASSETS_BUCKET_ID,
              HERO_VIDEO_FILENAME,
              HERO_VIDEO_FILE_ID
            )
          : Promise.resolve(null),
      ]);

      if (isCancelled) return;

      setPosterUrl(resolvedPosterUrl);
      setVideoUrl(resolvedVideoUrl);
      setCanPlayVideo(Boolean(allowVideo && resolvedVideoUrl));
    };

    resolveHeroAssets();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="dark">
      <div className="relative min-h-screen bg-transparent text-foreground">
        <div
          className="fixed inset-0 bg-black -z-20"
          style={
            posterUrl
              ? {
                  backgroundImage: `url("${posterUrl}")`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                }
              : undefined
          }
        />

        {canPlayVideo && videoUrl ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={posterUrl || undefined}
            className={`fixed inset-0 w-full h-full object-cover -z-10 transition-opacity duration-500 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ objectPosition: 'center' }}
            onCanPlay={() => setIsVideoLoaded(true)}
            onError={() => {
              setCanPlayVideo(false);
              setVideoUrl(null);
            }}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : null}

        <div className="fixed inset-0 bg-black/40 -z-10" />

        <Hero />
        <Features />
        <Footer />
      </div>
    </div>
  );
}
