import { useState, type AnchorHTMLAttributes, type ImgHTMLAttributes } from 'react';
import { Plane, Heart, BriefcaseBusiness, ArrowRight, Leaf, Menu, X, ArrowUpRight, Flag, Sparkles, ShieldCheck, Handshake, Compass, Presentation, HeartHandshake, CalendarCheck, Check, FileCheck2, MessagesSquare, ArrowDownRight, type LucideIcon } from 'lucide-react';
import ContactForm from './ContactForm';
import './styles.css';
import './sections.css';

function Link({to, hash, ...props}: AnchorHTMLAttributes<HTMLAnchorElement> & {to: string; hash?: string}) {
 return <a href={`${to}${hash ? '#'+hash : ''}`} {...props} />;
}
function Image(props: ImgHTMLAttributes<HTMLImageElement>) {return <img {...props} />;}

function Brand({ className = '' }: {className?: string}) {
  return <img src="/assets/give-holidays-logo.png" alt="Give Holidays" className={`brand-logo ${className}`} />;
}
const navigation = [['About Us', 'about'], ['How It Works', 'how-it-works'], ['For Nonprofits', 'nonprofits'], ['Travel Partners', 'travel-partners'], ['Contact', 'contact']];
function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="shell header-inner">
    <Link to="/" aria-label="Give Holidays home"><Brand /></Link>
    <nav aria-label="Main navigation" className="desktop-nav">{navigation.map(([name, id]) => <Link key={id} to="/" hash={id}>{name}</Link>)}</nav>
    <Link to="/" hash="contact" className="button primary header-cta">Get in Touch <ArrowUpRight size={15} /></Link>
    <button className="mobile-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </div>{open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{navigation.map(([name, id]) => <Link key={id} to="/" hash={id} onClick={() => setOpen(false)}>{name}</Link>)}</nav>}</header>;
}
function Hero() {
  return <section className="shell hero"><div className="hero-copy">
    <span className="eyebrow pill"><Leaf size={12} /> Travel with purpose</span>
    <Brand className="hero-brand" />
    <h1>Exceptional Travel Experiences.<br /><span>Greater Fundraising Impact.</span></h1>
    <p>Give Holidays specializes in curated travel and experience packages for nonprofit fundraising auctions. We bring together quality accommodations, memorable experiences, and professional travel coordination to help organizations inspire generosity and create lasting impact.</p>
    <div className="button-row"><Link to="/" hash="contact" className="button primary">Partner With Us <ArrowRight size={16} /></Link><Link to="/" hash="how-it-works" className="button secondary">Discover How It Works</Link></div>
  </div><div className="hero-visual"><div className="hero-photo"><Image src="/assets/hero.jpg" alt="An illuminated resort and swimming pool at dusk" className="w-full h-full" /><div className="photo-caption"><span className="caption-line" /> Extraordinary places. Meaningful possibilities.</div></div>
    <div className="hero-trust">{([[Plane, 'Curated Travel', 'Experiences'], [Heart, 'Nonprofit Fundraising', 'Specialists'], [BriefcaseBusiness, 'Professional Travel', 'Coordination']] as [LucideIcon, string, string][]).map(([Icon, a, b]) => <div key={a}><Icon size={21} strokeWidth={1.6} /><span>{a}<br />{b}</span></div>)}</div>
  </div></section>;
}
const benefits: [LucideIcon, string, string][] = [
  [Flag, 'Purpose-Built for Fundraising', 'Our travel packages are designed specifically for nonprofit auctions, helping organizations present compelling experiences that capture bidder interest.'],
  [Sparkles, 'Thoughtfully Curated Experiences', 'We focus on quality accommodations, desirable destinations, and memorable activities that create attractive auction offerings.'],
  [ShieldCheck, 'Professional Travel Coordination', 'From package planning to fulfillment, we focus on clear communication, organized processes, and dependable service.'],
  [Handshake, 'A Partnership-First Approach', 'We value strong working relationships with nonprofit organizations, hotels, and travel suppliers.'],
];
function WhySection() {
  return <section className="shell section why-section"><div className="section-heading"><span className="eyebrow">The Give Holidays difference</span><h2>Travel Experiences Designed<br className="desktop-break" /> to Make a Difference</h2><p>A dedicated travel partner connecting exceptional experiences with meaningful fundraising opportunities.</p></div><div className="benefit-grid">{benefits.map(([Icon, title, text]) => <article className="benefit-card" key={title}><span className="icon-disc"><Icon size={23} strokeWidth={1.5} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>;
}
function AboutSection() {
  return <section id="about" className="shell section editorial about-section"><div className="editorial-photo about-photo"><Image src="/assets/about.jpg" alt="A wooden boat on a mountain lake in the Dolomites" className="w-full h-full" /><span className="image-note"><Leaf size={18} /> A world of possibility. A purpose behind it.</span></div><div className="editorial-copy"><span className="eyebrow">About Give Holidays</span><h2>A Different Kind of Travel Company.<br />Built Around Giving.</h2><p>Give Holidays is a specialized travel company focused on creating exceptional travel and experience packages for nonprofit fundraising events.</p><p>We combine hospitality expertise with an understanding of charity auction fundraising to help organizations offer experiences that excite supporters and contribute to their fundraising goals.</p><p>Our approach emphasizes thoughtful package development, professional coordination, transparent communication, and positive experiences for everyone involved — from our hotel and travel partners to nonprofit organizers and winning bidders.</p><div className="mission"><Leaf size={20} /><p>Our mission is simple: connect meaningful travel experiences with organizations making a difference.</p></div></div></section>;
}
const steps: [LucideIcon, string, string][] = [[Compass, 'We Curate', 'Give Holidays develops travel and experience packages with a focus on quality, appeal, and fundraising suitability.'], [Presentation, 'Nonprofits Feature', 'Participating nonprofits showcase packages through their fundraising auctions, including those hosted on Gather.'], [HeartHandshake, 'Supporters Bid', 'Auction participants compete for exciting travel opportunities while supporting causes that matter to them.'], [CalendarCheck, 'We Coordinate', 'Following the auction, Give Holidays coordinates package fulfillment and provides applicable travel details and redemption instructions.']];
function ProcessSection() {
  return <section id="how-it-works" className="section process-section"><div className="shell"><div className="section-heading"><span className="eyebrow">How it works</span><h2>From Extraordinary Experiences<br />to Extraordinary Impact</h2></div><div className="process-grid">{steps.map(([Icon, title, text], i) => <article key={title}><span className="step-icon"><Icon size={25} strokeWidth={1.5} /><span className="step-number">0{i + 1}</span></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>;
}
function NonprofitSection() {
  return <section id="nonprofits" className="shell section"><div className="nonprofit-panel editorial"><div className="editorial-copy"><span className="eyebrow">For nonprofits</span><h2>Inspire More Bidding.<br />Create More Impact.</h2><p>An exceptional travel experience can become the centerpiece of a successful fundraising auction.</p><p>Give Holidays helps nonprofit organizations introduce desirable travel and experience packages into their fundraising events without requiring them to become travel experts.</p><ul className="check-list">{['Auction-ready travel experiences', 'Support throughout the package process', 'Designed specifically for nonprofit fundraising'].map(text => <li key={text}><Check size={16} />{text}</li>)}</ul><Link to="/" hash="contact" className="button primary">Discuss Your Fundraising Event <ArrowRight size={15} /></Link></div><div className="editorial-photo nonprofit-photo"><Image src="/assets/nonprofit.jpg" alt="Inviting tropical pool surrounded by resort sun loungers and lush palms" className="w-full h-full" /></div></div></section>;
}
function PartnersSection() {
  return <section id="travel-partners" className="partners-section"><div className="shell editorial"><div className="editorial-photo partner-photo"><Image src="/assets/partner.jpg" alt="Beautifully appointed hotel suite with warm lighting and thoughtful furnishings" className="w-full h-full" /><span className="image-note">Thoughtful hospitality. Shared purpose.</span></div><div className="editorial-copy"><span className="eyebrow">Hospitality & travel partnerships</span><h2>Building Meaningful Partnerships Across the Travel Industry</h2><p>Give Holidays collaborates with hotels, resorts, destination management companies, tour operators, and experience providers to develop thoughtfully curated travel packages for nonprofit fundraising events.</p><p>We value long-term relationships built on professionalism, clear communication, responsible representation, and mutually beneficial commercial arrangements.</p><ul className="check-list">{['Professional representation of accommodations and experiences', 'Clear coordination of package details and terms', 'Organized reservation and fulfillment communication', 'Opportunities to support nonprofit fundraising through travel'].map(text => <li key={text}><Check size={16} />{text}</li>)}</ul><p className="partner-promise">Our goal is to be the kind of travel partner you are confident doing business with.</p><Link to="/hotel-partners" className="button white-button">Explore a Supplier Partnership <ArrowRight size={15} /></Link></div></div></section>;
}
const commitments: [LucideIcon, string, string][] = [[FileCheck2, 'Clarity', 'Clear package descriptions, terms, and redemption information.'], [Sparkles, 'Quality', 'Thoughtful selection of travel experiences and accommodations.'], [MessagesSquare, 'Communication', 'Responsive, professional coordination throughout the process.'], [ShieldCheck, 'Accountability', 'A commitment to responsible package representation and fulfillment.']];
function CommitmentSection() {
  return <section className="shell section commitment-section"><div className="section-heading"><span className="eyebrow">Our commitment</span><h2>Professionalism at Every Step</h2><p>Trust is essential when travel experiences are part of a fundraising event. We recognize the responsibility involved in working with nonprofit organizations, hospitality partners, and travelers.</p></div><div className="commitment-grid">{commitments.map(([Icon, title, text]) => <article key={title}><Icon size={25} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>;
}
function GatherSection() {
  return <section className="shell gather-section"><div className="gather-mark" aria-label="Gather"><span className="icon-disc"><Leaf size={25} strokeWidth={1.6} /></span><span>gather<span className="gather-dot">.</span></span></div><div><span className="eyebrow">Our fundraising technology partner</span><h2>Better Together With Gather</h2><p>Give Holidays works alongside Gather, a nonprofit auction platform that helps organizations manage fundraising events and connect supporters with compelling auction opportunities.</p><p>Travel package discovery and auction participation are handled within the Gather platform.</p><a href="https://gatherforgood.bid" target="_blank" rel="noopener noreferrer" className="text-link">Discover Gather <ArrowUpRight size={15} /></a></div></section>;
}
function ContactSection() {
  return <section id="contact" className="contact-section"><div className="shell contact-grid"><div className="contact-copy"><span className="eyebrow">Get in touch</span><h2>Let's Create Something Meaningful Together</h2><p>Whether you're a nonprofit planning an auction, a hospitality supplier exploring a partnership, or a traveler with a question about a Give Holidays experience, we'd welcome the opportunity to connect.</p><div className="contact-signoff"><Leaf size={32} strokeWidth={1} /><span>Great experiences start<br />with a conversation.</span><ArrowDownRight size={25} strokeWidth={1.2} /></div></div><ContactForm /></div></section>;
}
function Footer() {
  return <footer className="footer"><div className="shell"><div className="footer-top"><div className="footer-brand"><Link to="/" aria-label="Give Holidays home"><Brand /></Link><p>Exceptional Travel Experiences<br />for Nonprofit Fundraising</p></div><nav className="footer-links" aria-label="Footer navigation">{navigation.map(([name, id]) => <Link key={id} to="/" hash={id}>{id === 'about' ? 'About' : name}</Link>)}</nav></div><div className="footer-bottom"><span>Copyright © Give Holidays 2026</span><nav aria-label="Legal"><Link to="/privacy-policy">Privacy Policy</Link><Link to="/terms-and-conditions">Terms & Conditions</Link></nav></div></div></footer>;
}
export { Header, Footer };
export default function SourceLanding() { return <><Hero /><WhySection /><AboutSection /><ProcessSection /><NonprofitSection /><PartnersSection /><CommitmentSection /><GatherSection /><ContactSection /></>; }
