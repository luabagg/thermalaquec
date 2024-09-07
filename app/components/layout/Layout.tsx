import * as React from 'react';
import Navbar from './Navbar';
import RouteChangeAnnouncement from './RouteChangeAnnouncement';

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <React.Fragment>
            <Navbar />
            {children}
            {/* <Footer /> */}
            <RouteChangeAnnouncement />
        </React.Fragment>
    );
}
