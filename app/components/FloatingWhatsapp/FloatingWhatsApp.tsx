import React from "react";
import whatsappIcon from "~/assets/whatsapp-icon.jpg";
import { useIsHomepage } from "~/hooks/isHomepage";
import { FloatingWhatsApp as FloatingWhatsAppComponent } from "react-floating-whatsapp";

export function FloatingWhatsApp() {
  const [visible, setVisible] = React.useState(false);

  const homepage = useIsHomepage();
  const icon = useIcon();

  React.useEffect(() => {
    if (!homepage || !icon) {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [homepage, icon]);

  return (
    <div className={visible ? "block" : "hidden"}>
      <FloatingWhatsAppComponent
        {...{
          phoneNumber: "+5554999161816",
          accountName: "Lucas - Thermal",
          chatMessage: "Olá, como posso ajudar?",
          placeholder: "Mensagem",
          statusMessage: "",
          avatar: whatsappIcon,
          messageDelay: 0.75,
          darkMode: true,
          allowEsc: true,
        }}
      />
    </div>
  );
}

function useIcon(): boolean {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    setOffset(window.scrollY);

    const onScroll = () => setOffset(window.scrollY);
    window.removeEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setOffset]);

  return offset > 150;
}
