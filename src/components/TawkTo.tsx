'use client';

import Script from 'next/script';

// Override via NEXT_PUBLIC_TAWKTO_WIDGET_ID (format: "<propertyId>/<widgetId>").
// Falls back to the installation the user provided.
const TAWKTO_WIDGET_ID =
  process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID ||
  '69e8b202cd78c41c35e02df4/1jmqfemm7';

export default function TawkTo() {
  if (!TAWKTO_WIDGET_ID) return null;

  return (
    <Script id="tawkto-widget" strategy="afterInteractive">
      {`
        var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        (function(){
          var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;
          s1.src='https://embed.tawk.to/${TAWKTO_WIDGET_ID}';
          s1.charset='UTF-8';
          s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);
        })();
      `}
    </Script>
  );
}
