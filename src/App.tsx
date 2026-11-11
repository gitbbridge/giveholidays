import { useEffect } from 'react';
import SourceLanding, { Header, Footer } from './SourceLanding';
import ContactForm from './ContactForm';
import { privacySections, termsSections } from './legal-content';
import AccessPage from './AccessPage';

function PartnershipPage() {
 return <section className="shell partnership-page"><span className="eyebrow">Hospitality &amp; Travel Partnerships</span><h1>Request Partnership Information</h1><p>Give Holidays collaborates with hotels, resorts, destination management companies, tour operators, and experience providers to develop thoughtfully curated travel packages for nonprofit fundraising events.</p><ContactForm partnership /></section>;
}
function LegalPage({terms = false}: {terms?: boolean}) {
 return <article className="shell legal-page"><a href="/" className="text-link">Back to Give Holidays</a><span className="eyebrow">Give Holidays</span><h1>{terms ? 'Terms & Conditions' : 'Privacy Policy'}</h1><p className="legal-date">Last updated: November 11, 2026</p>{(terms ? termsSections : privacySections).map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<p>For questions about this policy, please <a href="/#contact" className="text-link">contact Give Holidays</a>.</p></article>;
}
export default function App() {
 const path = window.location.pathname.replace(/\/$/, '') || '/';
 useEffect(() => {
   const titles: Record<string,string> = { '/': 'Give Holidays | Travel With Purpose', '/hotel-partners': 'Hotel Partnerships | Give Holidays', '/privacy-policy': 'Privacy Policy | Give Holidays', '/terms-and-conditions': 'Terms & Conditions | Give Holidays' };
   document.title = titles[path] || 'Give Holidays';
   document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://giveholidays.com${path === '/' ? '/' : path}`);
 }, [path]);
 return <>{import.meta.env.VITE_APP_ENV === 'staging' && <div className="test-mode" role="status">TEST MODE — fictional test data only</div>}<a className="skip-link" href="#main">Skip to content</a><Header /><main id="main">{path === '/' ? <SourceLanding /> : path === '/hotel-partners' ? <PartnershipPage /> : ['/access','/admin-entry'].includes(path)?<AccessPage admin={path==='/admin-entry'}/>: ['/privacy-policy','/privacy'].includes(path) ? <LegalPage /> : ['/terms-and-conditions','/terms'].includes(path) ? <LegalPage terms /> : <section className="shell status-page"><h1>Page not found</h1><a className="button primary" href="/">Return to Give Holidays</a></section>}</main><Footer /></>;
}
