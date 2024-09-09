import * as React from 'react';
import Navbar from './Navbar';
import RouteChangeAnnouncement from './RouteChangeAnnouncement';
import Footer from './Footer';
import type { NavigationMap, SocialMap } from './types';

interface LayoutProps {
    navigationMap: NavigationMap;
    socialMapNavbar: SocialMap;
    socialMapFooter: SocialMap;
}

export function Layout({ children, props }: { children: React.ReactNode, props: LayoutProps }) {
    return (
        <React.Fragment>
            <Navbar navigationMap={props.navigationMap} socialMap={props.socialMapNavbar} />
            {children}
            <Footer socialMap={props.socialMapFooter} />
            <RouteChangeAnnouncement />
        </React.Fragment>
    );
}
