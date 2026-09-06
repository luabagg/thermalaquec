import { useEffect, useState, type ComponentType } from "react";
import { useIsHomepage } from "~/hooks/isHomepage";
import { CONTACT } from "~/lib/site";
import type { WhatsAppWidgetProps } from "react-whatsapp-widget";

/** CSS-module hashes from `react-whatsapp-widget/dist/index.css` */
const WA = {
  panel: "._1yCVn",
  panelOpen: "_1qse9",
  fab: "._2qp0Z",
  closeBtn: "._lI8mw",
} as const;

const FADE_MS = 250;

type WhatsAppWidgetComponent = ComponentType<WhatsAppWidgetProps>;

/**
 * Homepage WhatsApp chat via `react-whatsapp-widget` (ann0nip).
 * Visual fixes: `app/styles/whatsapp-widget.css`
 *
 * Loaded only on the client — the package pulls in `react-icons`, which crashes
 * Node ESM SSR (`ERR_UNSUPPORTED_DIR_IMPORT`) and takes down the Vercel function.
 */
export function FloatingWhatsApp() {
  const [Widget, setWidget] = useState<WhatsAppWidgetComponent | null>(null);
  const homepage = useIsHomepage();
  const unlocked = useUnlockedAfterScroll(150);
  const shouldShow = Widget != null && homepage && unlocked;

  const [rendered, setRendered] = useState(false);
  const [opaque, setOpaque] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void import("react-whatsapp-widget").then((mod) => {
      if (!cancelled) setWidget(() => mod.WhatsAppWidget);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Mount once unlocked; fade in. Fade out then unmount when leaving homepage.
  useEffect(() => {
    if (shouldShow) {
      setRendered(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setOpaque(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setOpaque(false);
    const timer = window.setTimeout(() => setRendered(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [shouldShow]);

  // Close chat on outside click / Escape (package has no allowClickAway).
  useEffect(() => {
    if (!rendered) return;

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
  }, [rendered]);

  const pushGtm = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "whatsapp_click",
        button_location: "floating_chat",
      });
    }
  };

  if (!rendered || Widget == null) return null;

  return (
    <div
      onClickCapture={pushGtm}
      className={`transition-opacity ease-thermal ${
        opaque ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <Widget
        phoneNumber={CONTACT.phoneE164}
        companyName="Jiovani"
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
      src="/whatsapp-icon.webp"
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

/** Show once past threshold; stay unlocked for the rest of the session. */
function useUnlockedAfterScroll(threshold: number): boolean {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (unlocked) return;

    const onScroll = () => {
      if (window.scrollY > threshold) setUnlocked(true);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, unlocked]);

  return unlocked;
}
