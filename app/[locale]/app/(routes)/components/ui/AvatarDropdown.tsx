"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClerk } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import useAvatarStore from "@/store/useAvatarStore";

type Props = {
  avatar: string;
  userId: string;
  name: string;
  email: string;
};

const AvatarDropdown = ({ avatar, userId, name, email }: Props) => {
  const router = useRouter();
  const { signOut } = useClerk();
  const t = useTranslations();
  const setAvatar = useAvatarStore((state) => state.setAvatar);
  const getAvatar = useAvatarStore((state) => state.avatar);
  const [newAvatar, setNewAvatar] = useState(getAvatar);

  useEffect(() => {
    setAvatar(avatar);
  }, [avatar, setAvatar]);

  useEffect(() => {
    setNewAvatar(getAvatar);
  }, [getAvatar]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage
            src={
              newAvatar
                ? newAvatar
                : `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`
            }
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="space-y-1">
          <div>{name}</div>
          <div className="text-xs text-gray-500">{email}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/projects/dashboard")}>
          {t("AvatarDropdown.todoDashboard")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/app/profile")}>
          <Settings className="w-4 h-4 inline-block mr-2 stroke-current text-gray-500" />
          <span>{t("AvatarDropdown.profileSettings")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 inline-block mr-2 stroke-current text-gray-500" />
          <span>{t("AvatarDropdown.signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AvatarDropdown;
