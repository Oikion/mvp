import { getUser } from "@/actions/get-user";

import Container from "../components/ui/Container";
import { ProfileForm } from "./components/ProfileForm";
import { PasswordChangeForm } from "./components/PasswordChange";
import { ProfilePhotoForm } from "./components/ProfilePhotoForm";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
      <div className="space-y-6">
        {/*         <pre>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre> */}
        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePhotoForm data={data} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm data={data} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password change</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm userId={data.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <OpenAiForm userId={data.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteAccountForm userId={data.id} username={data.username} />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default ProfilePage;
