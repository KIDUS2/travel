import type { ReactNode } from 'react';
import { TeguwazLogo } from '../../components/TeguwazLogo';
import { config } from '../../config';

export const POLICY_DATE = '25 November 2026';

function Contact() {
  return config.contactEmail
    ? <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
    : <>the contact details shown in the app</>;
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="welcome">
      <div className="legal-head">
        <div className="welcome-inner">
          <a href="/" aria-label="Teguwaz home" style={{ textDecoration: 'none' }}><TeguwazLogo size={38} /></a>
          <span className="small"><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span>
        </div>
        <div className="tibeb thin" />
      </div>
      <article className="legal">
        <h1>{title}</h1>
        <p className="muted">Last updated {POLICY_DATE}</p>
        {children}
      </article>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy policy">
      <p>Teguwaz (ተጓዥ) is a travel memory app run by {config.operatorName}. This policy explains what we store, why, and the control you have over it. In short: your memories belong to you, private memories are seen by no one else, and we never sell your data.</p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Account:</strong> your name and email from the sign-in you choose (email and password, or Google), your language, and when you last used the app.</li>
        <li><strong>Memories:</strong> what you write, the photos, videos and voice notes you upload, places, regions, dates and GPS points, and who you chose can see each memory.</li>
        <li><strong>Trips and books:</strong> trip names, dates and members, and the pages and photos of books you design.</li>
        <li><strong>Channels:</strong> the names and links you add. If you connect a channel for stats, we keep read-only access tokens, encrypted, and the statistics the platform returns.</li>
        <li><strong>On your device:</strong> memories you save offline wait in your browser's storage until they upload, and the app keeps a copy of recently viewed pages so it opens without a connection. Signing out removes these.</li>
      </ul>

      <h2>Photo locations</h2>
      <p>When you add photos, Teguwaz reads the date and GPS location stored in the photo, on your device, to suggest the place and date. With Data saver on (the default), photos are resized before upload, which also removes that hidden location data from the uploaded file. The place you save with a memory is kept with the memory.</p>

      <h2>How we use it</h2>
      <p>Only to run the features you use: showing your memories, maps and coverage, building your books, showing your channel statistics, and keeping the service secure. We do not sell personal data, and we do not use your private memories for advertising.</p>

      <h2>Who can see your memories</h2>
      <ul>
        <li><strong>Only me:</strong> nobody but you.</li>
        <li><strong>Family:</strong> people you invite to the trip.</li>
        <li><strong>Public:</strong> anyone you share it with.</li>
      </ul>
      <p>New memories use your default from Account → Privacy (Only me unless you change it). Teguwaz never posts to social media for you.</p>

      <h2>Google and YouTube</h2>
      <p>If you sign in with Google, we receive your name, email and profile picture from Google. If you connect a YouTube channel, Teguwaz uses YouTube API Services with read-only access to the channel's statistics and analytics. By connecting, you agree to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a>; Google's handling of data is described in the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>. You can disconnect in Creator studio, or revoke access at any time in your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google account permissions</a>.</p>
      <p>Teguwaz's use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>

      <h2>TikTok and Instagram</h2>
      <p>If you connect TikTok or Instagram for stats, we receive read-only profile and content statistics from that platform, under its own terms. You can disconnect at any time, which deletes the stored tokens.</p>

      <h2>Payments</h2>
      <p>When you order a printed book, payment is handled by our payment provider, Chapa, which supports telebirr, bank and card payments. We receive the payment status and reference, never your card number or wallet PIN. We keep your delivery details to deliver the book.</p>

      <h2>Where it is stored and for how long</h2>
      <p>Your data is stored on the servers that run this Teguwaz service. We keep it while your account exists. When you delete a memory, it and its files are deleted. When you delete your account, everything is deleted, except records we must keep by law, such as payment receipts.</p>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Download:</strong> Account → Privacy → Download all my data.</li>
        <li><strong>Correct:</strong> edit any memory, trip, book or your profile.</li>
        <li><strong>Delete:</strong> delete any memory, or your whole account from Account → Privacy.</li>
        <li><strong>Questions or requests:</strong> contact <Contact />.</li>
      </ul>

      <h2>Children</h2>
      <p>Teguwaz is not meant for children under 13. A parent can keep family travel memories that include their children.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we will tell you in the app before it takes effect.</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of use">
      <p>These terms apply when you use Teguwaz, run by {config.operatorName}. By creating an account you agree to them.</p>
      <h2>Your content</h2>
      <p>You own the memories, photos and text you add. You give us permission to store, process and display them only to run Teguwaz for you and for the people you choose to share with, and to print the books you order. Only add content you have the right to use.</p>
      <h2>Acceptable use</h2>
      <p>Do not use Teguwaz to upload illegal content, to harass or harm others, to share other people's private information without permission, or to break or overload the service.</p>
      <h2>Connected platforms</h2>
      <p>Channel statistics come from YouTube, TikTok and Instagram under their own terms, including the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a>. Numbers may be delayed or differ from what the platform shows.</p>
      <h2>Printed books</h2>
      <p>Prices are shown in Ethiopian birr before you pay. Books are printed from the pages you design, so check spelling and photos in the preview before ordering. If a book arrives damaged or misprinted, contact us and we will reprint it.</p>
      <h2>Availability</h2>
      <p>We work to keep Teguwaz running and your data safe, but the service is provided as it is, and features may change. Keep your own copy of anything important; you can download all your data at any time.</p>
      <h2>Ending your account</h2>
      <p>You can delete your account at any time. We may suspend accounts that break these terms.</p>
      <h2>Contact</h2>
      <p>Questions: <Contact />.</p>
    </LegalPage>
  );
}
