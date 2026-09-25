import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/book/'],
        disallow: [
          '/dashboard',
          '/rooms',
          '/bookings',
          '/front-desk',
          '/stays',
          '/guests',
          '/housekeeping',
          '/maintenance',
          '/restaurant',
          '/kds',
          '/guest-portal',
          '/billing',
          '/inventory',
          '/staff',
          '/reports',
          '/ai',
          '/notifications',
          '/integrations',
          '/online-booking',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://stayhub.app'}/sitemap.xml`,
  };
}
