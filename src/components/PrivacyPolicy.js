import React from 'react';
import './TermsOfService.css'; // shared legal page styles

function PrivacyPolicy({ onBack }) {
  return (
    <div className="legal-page">
      <button className="back-btn" onClick={onBack}>Back</button>
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: February 25, 2026</p>

        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          <p>When you use Trivia Quiz, we collect the following information:</p>
          <ul>
            <li><strong>Account information:</strong> email address, username, and password (stored securely via Supabase Auth)</li>
            <li><strong>Quiz performance data:</strong> game scores, answers, categories played, difficulty levels, and timing data</li>
            <li><strong>Community data:</strong> community memberships, roles, chat messages, and announcements</li>
            <li><strong>User-submitted content:</strong> custom trivia questions, explanations, and tags</li>
            <li><strong>Uploaded media:</strong> images uploaded to our storage service for use in trivia questions</li>
            <li><strong>Settings and preferences:</strong> theme preference, privacy settings, leaderboard visibility</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Display your quiz scores, statistics, and achievements</li>
            <li>Populate leaderboards and community rankings</li>
            <li>Enable community features (chat, announcements, question sharing)</li>
            <li>Deliver the game review feature showing your past answers</li>
            <li>Generate analytics for community commissioners (aggregated performance data)</li>
            <li>Communicate with you about your account (password resets, etc.)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Data Storage</h2>
          <p>
            Your data is stored using Supabase, a cloud database platform. Supabase infrastructure is
            hosted in the United States. All data is transmitted over encrypted connections (HTTPS/TLS).
            Database access is controlled by Row Level Security (RLS) policies that ensure users can only
            access data they are authorized to view.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Third-Party Services</h2>
          <p>The Service uses the following third-party services:</p>
          <ul>
            <li><strong>Supabase:</strong> database, authentication, file storage, and real-time features</li>
            <li><strong>The Trivia API:</strong> external trivia questions for public quiz games</li>
            <li><strong>GitHub Pages:</strong> static hosting for the web application</li>
            <li><strong>YouTube:</strong> embedded video content for media questions (governed by YouTube's Terms of Service)</li>
            <li><strong>Sentry:</strong> error monitoring to improve reliability (collects anonymous error reports)</li>
          </ul>
          <p>
            Each third-party service has its own privacy policy. We encourage you to review their respective
            policies.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal information to third parties. Your data may be
            shared in the following limited circumstances:
          </p>
          <ul>
            <li><strong>Public leaderboards:</strong> username and aggregated scores are visible to other users (you can opt out in Settings)</li>
            <li><strong>Community features:</strong> your username and messages are visible to other community members</li>
            <li><strong>Legal requirements:</strong> we may disclose information if required by law or to protect the rights and safety of our users</li>
          </ul>
          <p>We do not share individual performance data with third parties or advertisers.</p>
        </section>

        <section className="legal-section">
          <h2>6. User Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access your data:</strong> view your profile, game history, and statistics through the app</li>
            <li><strong>Update your data:</strong> change your username, privacy settings, and preferences in Settings</li>
            <li><strong>Delete your account:</strong> request account deletion by contacting us at <strong>support@triviaquiz.app</strong></li>
            <li><strong>Export your data:</strong> request a copy of your data by contacting us</li>
            <li><strong>Opt out of leaderboards:</strong> toggle leaderboard visibility in Settings</li>
            <li><strong>Control profile visibility:</strong> toggle profile visibility in Settings</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Children's Privacy</h2>
          <p>
            The Service is not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13. If we become aware that we have collected
            information from a child under 13, we will take steps to delete that information. If you
            believe a child under 13 has provided us with personal information, please contact us at{' '}
            <strong>support@triviaquiz.app</strong>.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Cookies and Local Storage</h2>
          <p>
            The Service uses minimal browser storage for essential functionality only:
          </p>
          <ul>
            <li><strong>Authentication tokens:</strong> stored by Supabase to maintain your login session</li>
            <li><strong>Theme preference:</strong> stored in localStorage for immediate dark/light mode application</li>
          </ul>
          <p>
            We do not use tracking cookies, advertising cookies, or third-party analytics cookies.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Data Retention</h2>
          <p>
            Your account data and game history are retained for as long as your account is active. If you
            request account deletion, we will remove your personal data within 30 days. Aggregated,
            anonymized statistics may be retained indefinitely for platform analytics. Community content
            (questions, chat messages) associated with active communities may be retained after account
            deletion to preserve community integrity.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Security Measures</h2>
          <p>We implement the following security measures to protect your data:</p>
          <ul>
            <li>All data transmitted over encrypted connections (HTTPS/TLS)</li>
            <li>Passwords hashed and stored securely via Supabase Auth (bcrypt)</li>
            <li>Row Level Security (RLS) policies enforced at the database level</li>
            <li>Authentication tokens with automatic expiration and refresh</li>
            <li>File uploads validated for type and size before storage</li>
          </ul>
          <p>
            While we take reasonable measures to protect your data, no method of transmission or storage
            is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we make changes, we will update
            the "Last updated" date at the top of this page. We encourage you to review this policy
            periodically. Your continued use of the Service after changes constitutes acceptance of the
            updated policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about this Privacy Policy or how we handle your data, please
            contact us at <strong>support@triviaquiz.app</strong>.
          </p>
        </section>

        <div className="legal-notice">
          <p>
            This document is provided for informational purposes and does not constitute legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
