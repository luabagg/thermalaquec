import { WhatsappIcon } from "./WhatsappIcon";
import { CONTACT } from "~/lib/site";

export const WhatsappFloatingButton = () => {
  const handleWhatsappClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "whatsapp_click",
        button_location: "floating_button",
      });
    }
  };

  return (
    <a
      href={CONTACT.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-[#25D366] text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 z-50"
      aria-label="Fale conosco pelo WhatsApp"
      onClick={handleWhatsappClick}
    >
      <WhatsappIcon size={60} />
    </a>
  );
};
