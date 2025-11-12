import { useEffect } from 'react';
import { useIntegrations } from './useIntegrations';

// Declara o tipo do Meta Pixel
declare global {
  interface Window {
    fbq: any;
  }
}

export const useMetaPixel = () => {
  const { metaPixels } = useIntegrations();

  useEffect(() => {
    if (metaPixels.length === 0) return;

    // Função para carregar o script do Meta Pixel
    const loadFacebookPixel = () => {
      if (document.getElementById('facebook-pixel-script')) return;

      const script = document.createElement('script');
      script.id = 'facebook-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `;
      document.head.appendChild(script);
    };

    // Carrega o script do Meta Pixel
    loadFacebookPixel();

    // Aguarda um pouco para o script carregar
    setTimeout(() => {
      if (window.fbq) {
        // Inicializa todos os pixels configurados
        metaPixels.forEach((pixel) => {
          window.fbq('init', pixel.pixelId);
        });
        
        // Dispara o evento PageView para todos os pixels
        window.fbq('track', 'PageView');
      }
    }, 100);

    // Cleanup
    return () => {
      const script = document.getElementById('facebook-pixel-script');
      if (script) {
        script.remove();
      }
    };
  }, [metaPixels]);

  const trackEvent = (eventName: string, parameters?: any) => {
    if (window.fbq) {
      window.fbq('track', eventName, parameters);
    }
  };

  const trackCustomEvent = (eventName: string, parameters?: any) => {
    if (window.fbq) {
      window.fbq('trackCustom', eventName, parameters);
    }
  };

  return {
    trackEvent,
    trackCustomEvent,
    isLoaded: !!window.fbq
  };
};