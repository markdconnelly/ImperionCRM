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
  title: "End-User License Agreement — Imperion Business Manager",
  description: `The terms governing use of ${PRODUCT_NAME}.`,
  robots: { index: true, follow: true },
};

export default function EulaPage() {
  return (
    <LegalDoc
      title="End-User License Agreement"
      subtitle={`These terms govern use of ${PRODUCT_NAME}, provided by ${LEGAL_ENTITY}. By accessing or using the Application, you agree to them.`}
    >
      <Section heading="1. Acceptance">
        <P>
          This End-User License Agreement (the &ldquo;Agreement&rdquo;) is a legal agreement between
          you and {LEGAL_ENTITY} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
          governing your access to and use of {PRODUCT_NAME} (the &ldquo;Application&rdquo;). By
          accessing or using the Application you agree to be bound by this Agreement. If you do not
          agree, do not access or use the Application.
        </P>
      </Section>

      <Section heading="2. Internal use and eligibility">
        <P>
          The Application is an internal business-operations tool. Access is limited to authorized
          personnel of {LEGAL_ENTITY} and others we expressly permit, each using a company-issued
          identity. You are responsible for activity that occurs under your account and for keeping
          your credentials secure.
        </P>
      </Section>

      <Section heading="3. License grant">
        <P>
          Subject to this Agreement, we grant you a limited, non-exclusive, non-transferable,
          revocable license to access and use the Application solely for our authorized internal
          business purposes.
        </P>
      </Section>

      <Section heading="4. Acceptable use">
        <P>You agree not to:</P>
        <UL>
          <LI>use the Application for any unlawful purpose or in violation of any policy we provide;</LI>
          <LI>
            attempt to gain unauthorized access to the Application, its data, or its underlying
            systems, or circumvent any security or access control;
          </LI>
          <LI>
            interfere with or disrupt the integrity or performance of the Application, or reverse
            engineer it except to the extent permitted by law;
          </LI>
          <LI>
            access, export, or use data within the Application other than as needed for your
            authorized role.
          </LI>
        </UL>
      </Section>

      <Section heading="5. Connected services">
        <P>
          The Application integrates with third-party services (for example Microsoft 365,
          Autotask/Kaseya, and QuickBooks Online). Your use of those services through the
          Application is also subject to the terms and policies of the respective providers. The
          QuickBooks Online integration is <strong>read-only</strong>; the Application does not
          write to, or initiate payments in, QuickBooks Online. Connecting or disconnecting a
          third-party service is performed by an administrator.
        </P>
      </Section>

      <Section heading="6. Data and privacy">
        <P>
          Our handling of information in the Application is described in our{" "}
          <a className="text-accent hover:underline" href="/legal/privacy">
            Privacy Policy
          </a>
          , which is incorporated into this Agreement by reference.
        </P>
      </Section>

      <Section heading="7. Intellectual property">
        <P>
          The Application, including its software, design, and content, is owned by {LEGAL_ENTITY}{" "}
          or its licensors and is protected by intellectual-property laws. This Agreement grants no
          ownership rights; all rights not expressly granted are reserved.
        </P>
      </Section>

      <Section heading="8. Disclaimer of warranties">
        <P>
          The Application is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind, whether express or implied, including implied warranties of
          merchantability, fitness for a particular purpose, and non-infringement, to the maximum
          extent permitted by law.
        </P>
      </Section>

      <Section heading="9. Limitation of liability">
        <P>
          To the maximum extent permitted by law, {LEGAL_ENTITY} will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of data,
          profits, or revenue, arising out of or related to your use of the Application.
        </P>
      </Section>

      <Section heading="10. Termination">
        <P>
          We may suspend or terminate your access to the Application at any time, with or without
          notice, including for violation of this Agreement. Upon termination, the license granted
          to you ends and you must stop using the Application.
        </P>
      </Section>

      <Section heading="11. Changes to this Agreement">
        <P>
          We may update this Agreement from time to time. Material changes will be reflected by an
          updated effective date at the top of this page. Continued use of the Application after a
          change constitutes acceptance of the updated Agreement.
        </P>
      </Section>

      <Section heading="12. Governing law">
        <P>
          This Agreement is governed by the laws of the jurisdiction in which {LEGAL_ENTITY} is
          organized, without regard to its conflict-of-laws rules.
        </P>
      </Section>

      <Section heading="13. Contact">
        <P>
          Questions about this Agreement can be directed to <MailLink /> at {LEGAL_ENTITY}.
        </P>
      </Section>

      <CrossLinks current="eula" />
    </LegalDoc>
  );
}
