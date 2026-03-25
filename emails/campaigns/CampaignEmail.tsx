import * as React from "react";
import { Hr, Img, Section, Text } from "@react-email/components";
import {
  BaseLayout,
  EmailBadge,
  EmailHeader,
  EmailCTAButton,
  EmailText,
  EmailDetailsCard,
  BADGE_COLORS,
  resolveColors,
} from "@/emails/components/BaseLayout";
import { type EmailBlock, type BadgeColor } from "@/lib/communication/types";

interface CampaignEmailProps {
  blocks: EmailBlock[];
  previewText?: string;
  footerText?: string;
}

function renderBlock(block: EmailBlock, colors: ReturnType<typeof resolveColors>) {
  switch (block.type) {
    case "header":
      return (
        <EmailHeader
          key={block.id}
          title={block.props.title}
          subtitle={block.props.subtitle}
          colors={colors}
        />
      );

    case "text":
      return (
        <EmailText key={block.id} colors={colors}>
          {block.props.content}
        </EmailText>
      );

    case "button":
      return (
        <EmailCTAButton
          key={block.id}
          href={block.props.href}
          text={block.props.text}
          altLinkText={block.props.altLinkText}
          colors={colors}
        />
      );

    case "card":
      return (
        <EmailDetailsCard key={block.id} title={block.props.title} colors={colors}>
          {block.props.items.map((item, i) => (
            <Text
              key={i}
              style={{ color: colors.textSecondary }}
              className="text-sm m-0 mb-2 leading-6"
            >
              • {item}
            </Text>
          ))}
        </EmailDetailsCard>
      );

    case "divider":
      return (
        <Hr
          key={block.id}
          style={{ borderColor: colors.hrColor }}
          className="my-6"
        />
      );

    case "badge": {
      const colorClass = BADGE_COLORS[block.props.color as BadgeColor] ?? BADGE_COLORS.blue;
      return (
        <EmailBadge
          key={block.id}
          icon={block.props.icon || ""}
          text={block.props.text}
          colorClass={colorClass}
        />
      );
    }

    case "image":
      return (
        <Section key={block.id} className="mb-6 text-center">
          <Img
            src={block.props.src}
            alt={block.props.alt}
            width={block.props.width || 520}
            style={{ maxWidth: "100%", borderRadius: "8px" }}
          />
        </Section>
      );

    default:
      return null;
  }
}

export function CampaignEmail({
  blocks,
  previewText = "",
  footerText,
}: CampaignEmailProps) {
  const colors = resolveColors("estate");

  return (
    <BaseLayout previewText={previewText} footerText={footerText} emailTheme="estate">
      {blocks.map((block) => renderBlock(block, colors))}
    </BaseLayout>
  );
}

export default CampaignEmail;
