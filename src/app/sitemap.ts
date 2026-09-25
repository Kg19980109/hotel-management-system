import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stayhub.app';

  return [
    {
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
