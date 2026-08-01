import { useEffect, useState } from "react";
import { FloatingWhatsApp as FloatingWhatsAppWidget } from "react-floating-whatsapp";
import { useIsHomepage } from "~/hooks/isHomepage";
import { CONTACT, SITE_SHORT_NAME } from "~/lib/site";

/**
 * Homepage WhatsApp chat from `react-floating-whatsapp`.
 * CSS is loaded via `app/styles/floating-whatsapp.css` in root links —
 * the package injects styles only when `document` exists (breaks under Remix SSR).
 *
 * Do NOT enable `allowClickAway`: the package closes on every document click
 * (including the message input), with no outside-target check.
 */
export function FloatingWhatsApp() {
  const [mounted, setMounted] = useState(false);
  const homepage = useIsHomepage();
  const scrolled = useScrolledPast(150);
  const visible = mounted && homepage && scrolled;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "whatsapp_click",
        button_location: "floating_chat",
      });
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={visible ? "contents" : "pointer-events-none invisible"}
      aria-hidden={!visible}
    >
      <FloatingWhatsAppWidget
        phoneNumber={CONTACT.phoneE164}
        accountName={SITE_SHORT_NAME}
        chatMessage="Olá, como posso ajudar?"
        placeholder="Mensagem"
        statusMessage="Responde em horário comercial"
        avatar="/whatsapp-icon.jpg"
        messageDelay={0.75}
        darkMode
        allowEsc
        notification={false}
        onClick={handleClick}
      />
    </div>
  );
}

function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return past;
}
