declare module "react-whatsapp-widget" {
  import type { ComponentType, FC } from "react";

  export interface WhatsAppWidgetProps {
    phoneNumber: string;
    companyName?: string;
    replyTimeText?: string;
    message?: string;
    sendButtonText?: string;
    inputPlaceHolder?: string;
    open?: boolean;
    CompanyIcon?: ComponentType;
  }

  export const WhatsAppWidget: FC<WhatsAppWidgetProps>;
}
