import React from 'react';
import { FloatingWhatsApp as Component } from 'react-floating-whatsapp';
import whatsappIcon from "/images/whatsapp-icon.jpg";
import { useHomepage } from '../utils/hooks/useHomepage';
import { Box } from '@mui/material';

export function FloatingWhatsApp() {
    const [visible, setVisible] = React.useState(false);

    const homepage = useHomepage();
    const icon = useIcon();

    React.useEffect(() => {
        if (!homepage || !icon) {
            setVisible(false)
            return;
        }

        setVisible(true);
    }, [homepage, icon]);

    return (
        <Box className={visible ? 'block' : 'hidden'}>
            <Component {...{
                phoneNumber: '+5554999161816',
                accountName: 'Thermal Aquecimento',
                chatMessage: 'Olá, como posso ajudar?',
                placeholder: "Mensagem",
                statusMessage: "",
                avatar: whatsappIcon,
                messageDelay: .75,
                darkMode: true,
                allowEsc: true,
            }} />
        </Box>
    )
}

function useIcon(): boolean {
    const [offset, setOffset] = React.useState(0);

    React.useEffect(() => {
        setOffset(window.scrollY);

        const onScroll = () => setOffset(window.scrollY);
        window.removeEventListener('scroll', onScroll);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return offset > 150;
}