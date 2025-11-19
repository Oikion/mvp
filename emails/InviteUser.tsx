import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VercelInviteUserEmailProps {
  username: string;
  invitedByUsername: string;
  invitedUserPassword: string;
  userLanguage: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const InviteUserEmail = ({
  username,
  invitedByUsername,
  invitedUserPassword,
  userLanguage,
}: VercelInviteUserEmailProps) => {
  const previewText =
    userLanguage === "en"
      ? `You have been invited by ${invitedByUsername} to Oikion app`
      : userLanguage === "el"
      ? `Έχετε προσκληθεί από τον/την ${invitedByUsername} στην εφαρμογή Oikion`
      : `Byl jste pozván uživatelem ${invitedByUsername} do aplikace Oikion`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {userLanguage === "en"
                ? "You have been invited to cooperate on something special"
                : userLanguage === "el"
                ? "Έχετε προσκληθεί να συνεργαστείτε σε κάτι ξεχωριστό"
                : "Byl(a) jste pozván(a) ke spolupráci na něčem úžasném"}
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? `Hello ${username},`
                : userLanguage === "el"
                ? `Γεια σας ${username},`
                : `Dobrý den ${username},`}
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <strong>{invitedByUsername}</strong>
              {/*   (
            <Link
                href={`mailto:${invitedByEmail}`}
                className="text-blue-600 no-underline"
              >
                {invitedByEmail}
              </Link>   )*/}
              {userLanguage === "en"
                ? ` has invited you to the`
                : userLanguage === "el"
                ? ` σας προσκάλεσε στην`
                : ` Vás pozval ke spolupráci na`}
            </Text>
            <Text>
              <strong>{process.env.NEXT_PUBLIC_APP_NAME}</strong> app:
              <strong>{process.env.NEXT_PUBLIC_APP_URL}</strong>.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? `To accept this invitation, click the button below. And use this password to login: `
                : userLanguage === "el"
                ? `Για να αποδεχτείτε αυτή την πρόσκληση, κάντε κλικ στο παρακάτω κουμπί. Και χρησιμοποιήστε αυτόν τον κωδικό πρόσβασης για σύνδεση: `
                : `Pro přijetí této pozvánky klikněte na tlačítko níže. A použijte toto heslo pro přihlášení: `}
              <strong>{invitedUserPassword}</strong>
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-slate-800 rounded-md text-white  py-3 px-4 text-[12px] font-semibold no-underline text-center"
                href={process.env.NEXT_PUBLIC_APP_URL}
              >
                {userLanguage === "en" 
                  ? "Join the team" 
                  : userLanguage === "el"
                  ? "Ενταξή στην ομάδα"
                  : "Připojit se"}
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? `or copy and paste this URL into your browser:`
                : userLanguage === "el"
                ? `ή αντιγράψτε και επικολλήστε αυτό το URL στον περιηγητή σας:`
                : `nebo zkopírujte a vložte tento odkaz do svého prohlížeče:`}{" "}
              <Link
                href={process.env.NEXT_PUBLIC_APP_URL}
                className="text-blue-600 no-underline"
              >
                {process.env.NEXT_PUBLIC_APP_URL}
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-slate-500 text-muted-foreground text-[12px] leading-[24px]">
              {userLanguage === "en"
                ? `This invitation was intended for `
                : userLanguage === "el"
                ? `Αυτή η πρόσκληση προοριζόταν για `
                : `Toto pozvání bylo určeno pro `}
              <span className="text-black">{username}. </span>
              {userLanguage === "en"
                ? "If you were not expecting this invitation, you can ignore this email. If you are concerned about your account's safety, please reply to this email to get in touch with us."
                : userLanguage === "el"
                ? "Εάν δεν περιμένατε αυτή την πρόσκληση, μπορείτε να αγνοήσετε αυτό το email. Εάν ανησυχείτε για την ασφάλεια του λογαριασμού σας, παρακαλούμε απαντήστε σε αυτό το email για να επικοινωνήσετε μαζί μας."
                : "Pokud jste toto pozvání neočekávali, můžete tento e-mail ignorovat. Pokud se obáváte o bezpečnost svého účtu, odpovězte na tento e-mail, abyste se s námi spojili."}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InviteUserEmail;
