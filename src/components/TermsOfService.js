import React from 'react';
import './TermsOfService.css';

function TermsOfService({ onBack }) {
  return (
    <div className="legal-page">
      <button className="back-btn" onClick={onBack}>Back</button>
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: February 25, 2026</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Trivia Quiz platform ("Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
            We reserve the right to update these Terms at any time. Continued use of the Service after
            changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Description of Service</h2>
          <p>
            Trivia Quiz is a free educational trivia quiz platform that allows users to play trivia games,
            join community leagues, create and share custom questions, track performance statistics, and
            compete on leaderboards. The Service is provided for educational and entertainment purposes.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. User Accounts</h2>
          <p>
            To use the Service, you must create an account by providing a valid email address, a username,
            and a password. You are responsible for maintaining the confidentiality of your account credentials
            and for all activities that occur under your account. You must notify us immediately of any
            unauthorized use of your account.
          </p>
          <p>
            You must be at least 13 years of age to create an account. By creating an account, you represent
            that you meet this age requirement. We reserve the right to suspend or terminate accounts that
            violate these Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. User Content</h2>
          <p>
            Users may submit content including custom trivia questions, community questions, chat messages,
            and uploaded media ("User Content"). You retain ownership of your User Content. By submitting
            User Content to the Service, you grant us a non-exclusive, worldwide, royalty-free license to
            use, display, reproduce, and distribute your User Content in connection with operating and
            providing the Service.
          </p>
          <p>
            You represent that you have the right to submit any User Content you provide and that it does
            not infringe upon the intellectual property rights, privacy rights, or any other rights of any
            third party. We reserve the right to remove any User Content that violates these Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Community Management</h2>
          <p>
            Community commissioners are responsible for managing their communities in accordance with these
            Terms. Commissioners may set community rules, manage members, create and curate questions, and
            moderate chat. Commissioners must not use their privileges to harass, discriminate against, or
            unfairly treat community members.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Intellectual Property</h2>
          <p>
            The Service, including its design, code, features, and branding, is owned by the platform
            operators and is protected by applicable intellectual property laws. Users retain ownership
            of their submitted content as described in Section 4. Trivia questions sourced from third-party
            APIs (such as The Trivia API) are subject to their respective terms of use.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use automated tools or scripts to interact with the Service (bots, scrapers, etc.)</li>
            <li>Attempt to manipulate scores, leaderboards, or game outcomes</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Submit content that is obscene, defamatory, hateful, or promotes violence</li>
            <li>Upload malicious files or content designed to disrupt the Service</li>
            <li>Impersonate other users or misrepresent your identity</li>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to other users' accounts or data</li>
            <li>Spam or send unsolicited messages through community features</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>
          <p>
            Trivia questions and answers are provided for entertainment and educational purposes only. We
            do not guarantee the accuracy or completeness of any trivia content, including questions sourced
            from third-party APIs or submitted by users.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM OPERATORS SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
            DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. When we make changes, we will update
            the "Last updated" date at the top of this page. Your continued use of the Service after any
            changes indicates your acceptance of the revised Terms. We encourage you to review these Terms
            periodically.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States
            and the District of Columbia, without regard to conflict of law principles.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at{' '}
            <strong>support@triviaquiz.app</strong>.
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

export default TermsOfService;
