import { useEffect, useState } from "react";
import { WhatsAppWidget } from "react-whatsapp-widget";
import { useIsHomepage } from "~/hooks/isHomepage";
import { CONTACT, SITE_SHORT_NAME } from "~/lib/site";

/** CSS-module hashes from `react-whatsapp-widget/dist/index.css` */
const WA = {
  panel: "._1yCVn",
  panelOpen: "_1qse9",
  fab: "._2qp0Z",
  closeBtn: "._lI8mw",
} as const;

/**
 * Homepage WhatsApp chat via `react-whatsapp-widget` (ann0nip).
 * Visual fixes: `app/styles/whatsapp-widget.css`
 */
export function FloatingWhatsApp() {
  const [mounted, setMounted] = useState(false);
  const homepage = useIsHomepage();
  const scrolled = useScrolledPast({ showAt: 150, hideAt: 80 });
  const visible = mounted && homepage && scrolled;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close chat on outside click / Escape (package has no allowClickAway).
  useEffect(() => {
    if (!visible) return;

    const isChatOpen = () => {
      const panel = document.querySelector(WA.panel);
      return panel?.classList.contains(WA.panelOpen) ?? false;
    };

    const closeChat = () => {
      const btn = document.querySelector(WA.closeBtn) as HTMLElement | null;
      btn?.click();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isChatOpen()) return;
      const target = event.target as Node | null;
      if (!target) return;
      const panel = document.querySelector(WA.panel);
      const fab = document.querySelector(WA.fab);
      if (panel?.contains(target) || fab?.contains(target)) return;
      closeChat();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isChatOpen()) closeChat();
    };

    // Next tick so the opening click does not immediately close.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [visible]);

  const pushGtm = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "whatsapp_click",
        button_location: "floating_chat",
      });
    }
  };

  // Unmount when hidden — avoids ugly partial paint from `invisible` + fixed layers.
  if (!visible) return null;

  return (
    <div onClickCapture={pushGtm}>
      <WhatsAppWidget
        phoneNumber={CONTACT.phoneE164}
        companyName={SITE_SHORT_NAME}
        replyTimeText="Responde em horário comercial"
        message="Olá, como posso ajudar?"
        inputPlaceHolder="Mensagem"
        sendButtonText="Enviar"
        CompanyIcon={ThermalAvatar}
      />
    </div>
  );
}

function ThermalAvatar() {
  return (
    <img
      src="/whatsapp-icon.jpg"
      alt=""
      width={40}
      height={40}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  );
}

/** Hysteresis so fast scroll near the threshold does not flicker. */
function useScrolledPast({
  showAt,
  hideAt,
}: {
  showAt: number;
  hideAt: number;
}): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setPast((wasPast) => {
        if (wasPast) return y > hideAt;
        return y > showAt;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAt, hideAt]);

  return past;
}
