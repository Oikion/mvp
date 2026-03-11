import * as React from "react";
import { BaseLayout } from "./components/BaseLayout";

interface EmailTemplateProps {
  firstName: string;
  userTheme?: string;
}

export const DemoTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  userTheme,
}) => (
  <BaseLayout previewText={`Welcome, ${firstName}!`} emailTheme={userTheme}>
    <div>
      <h1>Welcome, {firstName}!</h1>
    </div>
  </BaseLayout>
);
