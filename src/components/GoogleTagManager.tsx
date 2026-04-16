import Script from 'next/script';

// Google Tag Manager — loads the GTM container which then fires any tags
// configured inside the GTM UI (GA4, Meta pixel, conversions, etc.).
// This is distinct from the direct GA4 loader in GoogleAnalytics.tsx: GTM
// is a container, GA4 is a single tag. If both are set and GA4 is ALSO
// configured inside GTM you'll get duplicate pageviews — pick one.
//
// Container ID comes from NEXT_PUBLIC_GTM_ID at build time (Next.js bakes
// NEXT_PUBLIC_* vars into the client bundle during `next build`). If the
// var is unset the component renders nothing so it's safe to always mount.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function GoogleTagManagerHead() {
  if (!GTM_ID) return null;
  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

// GTM's <noscript> fallback iframe — belongs at the top of <body>.
// Required by GTM for users with JS disabled + for some tag configurations
// that rely on the iframe reference.
export function GoogleTagManagerNoscript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
