import { getUser } from "@/actions/get-user";

import Container from "../components/ui/Container";
import { ProfileForm } from "./components/ProfileForm";
import { PasswordChangeForm } from "./components/PasswordChange";
import { ProfilePhotoForm } from "./components/ProfilePhotoForm";

import H4Title from "@/components/typography/h4";
import { OpenAiForm } from "./components/OpenAiForm";
import { DeleteAccountForm } from "./components/DeleteAccountForm";

const ProfilePage = async () => {
  const data = await getUser();

  if (!data) {
    return <div>No user data.</div>;
  }

  return (
    <Container
      title="Profile"
      description={"Here you can edit your user profile"}
    >
      <div>
        {/*         <pre>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre> */}
        <H4Title>Profile photo</H4Title>
        <ProfilePhotoForm data={data} />

        <H4Title>Profile</H4Title>
        <ProfileForm data={data} />

        <H4Title>Password change</H4Title>
        <PasswordChangeForm userId={data.id} />

        

        <H4Title>OpenAI Integration</H4Title>
        <OpenAiForm userId={data.id} />

        <H4Title>Delete Account</H4Title>
        <div className="p-5">
          <DeleteAccountForm userId={data.id} username={data.username} />
        </div>
      </div>
    </Container>
  );
};

export default ProfilePage;
