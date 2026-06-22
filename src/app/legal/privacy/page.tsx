import type { Metadata } from "next";
import {
  CrossLinks,
  LegalDoc,
  LEGAL_ENTITY,
  LI,
  MailLink,
  P,
  PRODUCT_NAME,
  Section,
  UL,
} from "../legal-ui";

export const metadata: Metadata = {
  title: "Privacy Policy — Imperion OS",
  description:
    "How Imperion OS collects, uses, stores, and protects information, including data accessed from QuickBooks Online.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      subtitle={`This policy explains how ${LEGAL_ENTITY} handles information within ${PRODUCT_NAME}, including data accessed through connected services such as QuickBooks Online.`}
    >
      <Section heading="1. Overview">
        <P>
          {PRODUCT_NAME} (the &ldquo;Application&rdquo;) is an internal business-operations
          platform operated by {LEGAL_ENTITY} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;). It is used by our authorized personnel to run our managed-services
          business — including customer relationship management, project delivery, finance, and
          support. This policy describes what information the Application processes, why, and how
          we protect it.
        </P>
        <P>
          The Application is not a consumer product and is not offered to the general public.
          Access requires an authorized company identity.
        </P>
      </Section>

      <Section heading="2. Information we process">
        <UL>
          <LI>
            <strong>Identity &amp; access data.</strong> Authentication is handled by Microsoft
            Entra ID (single sign-on). We process the signed-in user&rsquo;s name, work email,
            role, and authorization scope to enforce access control and maintain audit logs.
          </LI>
          <LI>
            <strong>Business operational data.</strong> Records our personnel create or manage in
            the course of operating the business — accounts, contacts, projects, tickets,
            timesheets, expenses, and related notes.
          </LI>
          <LI>
            <strong>Data from connected services.</strong> Where an administrator connects a
            third-party system (for example Microsoft 365, Autotask/Kaseya, or QuickBooks Online),
            the Application reads data from that system to support the relevant business process.
            The QuickBooks Online integration is described in Section 3.
          </LI>
          <LI>
            <strong>Operational logs.</strong> Security and diagnostic logs (for example sign-in
            events and audit entries). These never contain credentials or access tokens.
          </LI>
        </UL>
      </Section>

      <Section heading="3. QuickBooks Online integration">
        <P>
          When an administrator connects our company&rsquo;s QuickBooks Online account, the
          Application uses Intuit&rsquo;s authorized OAuth 2.0 flow to obtain{" "}
          <strong>read-only</strong> access to accounting data. We use this access solely to
          reconcile internal finance processes. Specifically:
        </P>
        <UL>
          <LI>
            <strong>What we access (read-only):</strong> company information, the chart of accounts
            (expense categories), vendors, and purchase/expense transactions.
          </LI>
          <LI>
            <strong>Why we access it:</strong> to match employee expense reimbursements and
            contractor payments recorded in the Application against the corresponding payments in
            QuickBooks Online, and to align expense categories with our chart of accounts.
          </LI>
          <LI>
            <strong>We never write to QuickBooks.</strong> The Application does not create, modify,
            delete, or pay anything in QuickBooks Online. The connection is read-only in every part
            of the Application.
          </LI>
          <LI>
            <strong>We do not sell, rent, or share QuickBooks data.</strong> QuickBooks data is
            used only for the internal reconciliation purposes above and is never sold, used for
            advertising, or disclosed to third parties except as required to operate the
            Application (see Section 6) or by law.
          </LI>
          <LI>
            <strong>Token custody.</strong> The OAuth tokens that authorize the connection are
            stored encrypted in Microsoft Azure Key Vault, never in the application database and
            never in logs. An administrator can disconnect the integration at any time, which
            revokes our stored credentials.
          </LI>
        </UL>
      </Section>

      <Section heading="4. How we use information">
        <P>We use the information above to:</P>
        <UL>
          <LI>operate the Application&rsquo;s business-management features;</LI>
          <LI>reconcile finance records (time, expenses, reimbursements) across connected systems;</LI>
          <LI>enforce access control, maintain audit trails, and secure the Application;</LI>
          <LI>diagnose problems and improve reliability.</LI>
        </UL>
        <P>
          We do not use connected-service data, including QuickBooks Online data, for advertising,
          and we do not sell it.
        </P>
      </Section>

      <Section heading="5. How we store and protect information">
        <P>
          The Application is hosted on Microsoft Azure. We apply layered security controls,
          including:
        </P>
        <UL>
          <LI>encryption of data in transit (TLS) and at rest;</LI>
          <LI>
            secrets and OAuth tokens held in Azure Key Vault with role-based access, never in the
            database;
          </LI>
          <LI>identity-based access control (Microsoft Entra ID) with least-privilege roles;</LI>
          <LI>audit logging of sensitive actions and continuous security monitoring.</LI>
        </UL>
      </Section>

      <Section heading="6. Service providers">
        <P>
          We rely on a small number of vetted providers to operate the Application — for example
          Microsoft (Azure hosting and identity), Intuit (QuickBooks Online), and our AI processing
          providers for in-application assistance. These providers process data only as needed to
          provide their service to us and under their own contractual and security obligations. We
          do not sell information to anyone.
        </P>
      </Section>

      <Section heading="7. Data retention">
        <P>
          We retain information for as long as needed for the business purpose it serves and to
          meet our legal, accounting, and audit obligations, after which it is deleted or
          anonymized. Data read from QuickBooks Online is retained only as long as needed for
          reconciliation and is removed when no longer required or when the integration is
          disconnected.
        </P>
      </Section>

      <Section heading="8. Your choices and rights">
        <P>
          Because the Application is an internal tool, individual access is managed by our
          administrators. Authorized users and connected-account owners may request information
          about the data we hold, request correction, or disconnect a connected service. Contact us
          using the details below.
        </P>
      </Section>

      <Section heading="9. Children's privacy">
        <P>
          The Application is a business tool intended for our authorized personnel and is not
          directed to children. We do not knowingly collect personal information from children.
        </P>
      </Section>

      <Section heading="10. Changes to this policy">
        <P>
          We may update this policy from time to time. Material changes will be reflected by an
          updated effective date at the top of this page.
        </P>
      </Section>

      <Section heading="11. Contact us">
        <P>
          Questions about this policy or our data practices can be directed to <MailLink /> at{" "}
          {LEGAL_ENTITY}.
        </P>
      </Section>

      <CrossLinks current="privacy" />
    </LegalDoc>
  );
}
